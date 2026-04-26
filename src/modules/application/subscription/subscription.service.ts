import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import appConfig from 'src/config/app.config';
import {
  PeriodType,
  SubscriptionPlanStatus,
  SubscriptionStatus,
  UserKind,
} from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/client';
import type Stripe from 'stripe';
import {
  CancelSubscriptionDto,
  QueryAvailableSubscriptionPlansDto,
  SubscriptionCheckoutDto,
} from './dto/create-subscription.dto';
import { PromoCodeService } from 'src/modules/promo-code/promo-code.service';

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: {
    plan: {
      select: {
        id: true;
        name: true;
        price_pence: true;
        currency: true;
        trial_period_days: true;
      };
    };
  };
}>;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly pendingCheckoutTtlMs = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly promoCodeService: PromoCodeService,
  ) {}

  async getAvailablePlans(query: QueryAvailableSubscriptionPlansDto = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);

    const where: Prisma.SubscriptionPlanWhereInput = {
      status: SubscriptionPlanStatus.ACTIVE,
      is_legacy_price: false,
    };

    const [plans, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: [{ price_pence: 'asc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price_pence: true,
          currency: true,
          period_type: true,
          trial_period_days: true,
          stripe_price_id: true,
        },
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    return ResponseHelper.success({
      message: 'Subscription plans fetched successfully',
      data: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price_pence: plan.price_pence,
        currency: plan.currency,
        price_formatted: this.formatPrice(plan.price_pence, plan.currency),
        period_type: plan.period_type,
        trial_period_days: plan.trial_period_days,
        is_checkout_ready: Boolean(plan.stripe_price_id),
      })),
      meta_data: {
        page,
        limit,
        total,
      },
    });
  }

  async getCurrentSubscription(user_id: string) {
    await this.ensureGarageUser(user_id);

    const subscription = await this.findLatestSubscription(user_id);

    return ResponseHelper.success({
      message: subscription
        ? 'Subscription fetched successfully'
        : 'No subscription found',
      data: subscription ? this.formatSubscription(subscription) : null,
    });
  }

  async createCheckoutSession(
    user_id: string,
    checkoutDto: SubscriptionCheckoutDto,
  ) {
    const user = await this.ensureGarageUser(user_id);

    const existingSubscription =
      await this.findActiveAccessSubscription(user_id);
    if (existingSubscription) {
      throw new ConflictException(
        'You already have an active subscription. Please manage or cancel it before starting a new one.',
      );
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id: checkoutDto.plan_id,
        status: SubscriptionPlanStatus.ACTIVE,
        is_legacy_price: false,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    if (!plan.stripe_price_id) {
      throw new BadRequestException(
        'This plan is not synced with Stripe yet. Please contact support.',
      );
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomer(user);
    const promoCode = await this.promoCodeService.validateForRedemption(
      checkoutDto.promo_code,
    );

    const subscription = await this.getOrCreatePendingCheckoutSubscription({
      user_id,
      plan,
      stripeCustomerId,
    });

    try {
      const clientUrl = appConfig().app.client_app_url || appConfig().app.url;
      const session =
        await StripePayment.createCheckoutSessionSubscriptionWithMetadata({
          customer: stripeCustomerId,
          price: plan.stripe_price_id,
          metadata: {
            subscription_id: subscription.id,
            user_id,
            plan_id: plan.id,
            source: 'garage_subscription',
            ...(promoCode && {
              promo_code_id: promoCode.id,
              stripe_promotion_code_id: promoCode.stripe_promotion_code_id,
              promo_code: promoCode.code,
            }),
          },
          success_url: `${clientUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${clientUrl}/subscription/cancel`,
          trial_period_days: plan.trial_period_days,
          promotion_code_id: promoCode?.stripe_promotion_code_id,
        });

      return ResponseHelper.success({
        message: 'Subscription checkout session created successfully',
        data: {
          checkout_url: session.url,
          session_id: session.id,
          subscription_id: subscription.id,
        },
      });
    } catch (error) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancel_at: new Date(),
          cancellation_reason: 'Checkout session creation failed',
        },
      });

      throw error;
    }
  }

  async createBillingPortalSession(user_id: string) {
    const user = await this.ensureGarageUser(user_id);

    const subscription = await this.findManageableSubscription(user_id);
    if (!subscription) {
      throw new NotFoundException(
        'No active subscription found. Please subscribe to a plan first.',
      );
    }

    const stripeCustomerId =
      user.billing_id || subscription.stripe_customer_id || null;

    if (!stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer is linked to this account.',
      );
    }

    const session = await StripePayment.createBillingSession(stripeCustomerId);

    return ResponseHelper.success({
      message: 'Billing portal session created successfully',
      data: {
        url: session.url,
        ...(subscription.status === SubscriptionStatus.PAST_DUE
          ? {
              payment_failure_context:
                this.getPaymentFailureContext(subscription),
            }
          : {}),
      },
    });
  }

  async cancelSubscription(user_id: string, dto: CancelSubscriptionDto) {
    await this.ensureGarageUser(user_id);

    const subscription = await this.findManageableSubscription(user_id);
    if (!subscription) {
      throw new NotFoundException('No active subscription found to cancel.');
    }
    if (!subscription.stripe_subscription_id) {
      throw new BadRequestException(
        'No Stripe subscription is linked to this subscription.',
      );
    }

    const stripeSubscription =
      await StripePayment.cancelSubscriptionAtPeriodEnd(
        subscription.stripe_subscription_id,
      );
    const periods = this.extractStripePeriods(stripeSubscription);

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancel_at_period_end: true,
        cancel_at: stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000)
          : periods.current_period_end,
        cancellation_reason: dto.reason ?? null,
        current_period_start:
          periods.current_period_start ?? subscription.current_period_start,
        current_period_end:
          periods.current_period_end ?? subscription.current_period_end,
        next_billing_date:
          periods.current_period_end ?? subscription.next_billing_date,
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price_pence: true,
            currency: true,
            trial_period_days: true,
          },
        },
      },
    });

    return ResponseHelper.success({
      message:
        'Subscription cancellation scheduled for the end of the current billing period',
      data: {
        subscription: this.formatSubscription(updatedSubscription),
        effective_date:
          updatedSubscription.cancel_at ||
          updatedSubscription.current_period_end ||
          new Date(),
        cancelled_immediately: false,
      },
    });
  }

  async validateCheckoutSession(session_id: string) {
    if (!session_id) {
      throw new BadRequestException('session_id is required');
    }

    const session = await StripePayment.retrieveCheckoutSession(session_id);
    const paymentComplete = ['paid', 'no_payment_required'].includes(
      session.payment_status,
    );

    if (!paymentComplete) {
      throw new BadRequestException(
        `Payment is not complete. Status: ${session.payment_status}`,
      );
    }

    const stripeSubscriptionId = this.getStripeSubscriptionId(session);
    if (!stripeSubscriptionId) {
      throw new BadRequestException(
        'No subscription found in checkout session',
      );
    }

    const stripeSubscription =
      await StripePayment.retrieveSubscription(stripeSubscriptionId);

    const subscription = await this.applyStripeSubscriptionToLocalRecord(
      stripeSubscription,
      {
        subscription_id: session.metadata?.subscription_id,
        user_id: session.metadata?.user_id,
        plan_id: session.metadata?.plan_id,
        stripe_promotion_code_id: session.metadata?.stripe_promotion_code_id,
      },
    );

    return ResponseHelper.success({
      message: 'Subscription checkout validated successfully',
      data: {
        session_id,
        subscription: this.formatSubscription(subscription),
      },
    });
  }

  async applyStripeSubscriptionToLocalRecord(
    stripeSubscription: Stripe.Subscription,
    hints: {
      subscription_id?: string | null;
      user_id?: string | null;
      plan_id?: string | null;
      stripe_promotion_code_id?: string | null;
    } = {},
  ): Promise<SubscriptionWithPlan> {
    const stripeSubscriptionId = stripeSubscription.id;
    const stripeCustomerId = this.getStripeCustomerId(stripeSubscription);
    const periods = this.extractStripePeriods(stripeSubscription);
    const mappedStatus = this.mapStripeStatus(stripeSubscription.status);

    const localSubscription =
      (hints.subscription_id
        ? await this.prisma.subscription.findUnique({
            where: { id: hints.subscription_id },
          })
        : null) ||
      (await this.prisma.subscription.findFirst({
        where: { stripe_subscription_id: stripeSubscriptionId },
      }));

    if (!localSubscription && (!hints.user_id || !hints.plan_id)) {
      throw new NotFoundException('Local subscription record not found');
    }

    const subscription = localSubscription
      ? await this.prisma.subscription.update({
          where: { id: localSubscription.id },
          data: {
            status: mappedStatus,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: stripeCustomerId,
            current_period_start:
              periods.current_period_start ??
              localSubscription.current_period_start,
            current_period_end:
              periods.current_period_end ??
              localSubscription.current_period_end,
            next_billing_date:
              periods.current_period_end ?? localSubscription.next_billing_date,
            cancel_at_period_end:
              stripeSubscription.cancel_at_period_end ?? false,
            cancel_at: stripeSubscription.cancel_at
              ? new Date(stripeSubscription.cancel_at * 1000)
              : null,
          },
          include: this.subscriptionInclude(),
        })
      : await this.createSubscriptionFromStripe(
          stripeSubscription,
          hints.user_id,
          hints.plan_id,
          stripeCustomerId,
          mappedStatus,
          periods,
        );

    if (stripeCustomerId) {
      await this.prisma.user.updateMany({
        where: {
          id: subscription.user_id,
          OR: [{ billing_id: null }, { billing_id: { not: stripeCustomerId } }],
        },
        data: {
          billing_id: stripeCustomerId,
        },
      });
    }

    await this.promoCodeService.markRedeemedByStripePromotionCode(
      hints.stripe_promotion_code_id,
    );

    return subscription;
  }

  async markStripeSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const stripeSubscriptionId = stripeSubscription.id;
    const periods = this.extractStripePeriods(stripeSubscription);

    await this.prisma.subscription.updateMany({
      where: { stripe_subscription_id: stripeSubscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancel_at:
          stripeSubscription.canceled_at || stripeSubscription.cancel_at
            ? new Date(
                (stripeSubscription.canceled_at ||
                  stripeSubscription.cancel_at) * 1000,
              )
            : new Date(),
        cancel_at_period_end: false,
        current_period_end: periods.current_period_end,
        next_billing_date: null,
      },
    });
  }

  private async ensureGarageUser(user_id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: user_id,
        kind: UserKind.GARAGE,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        billing_id: true,
        kind: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Garage user not found');
    }

    return user;
  }

  private async getOrCreateStripeCustomer(user: {
    id: string;
    name: string | null;
    email: string | null;
    billing_id: string | null;
  }) {
    if (user.billing_id) {
      const isValid = await StripePayment.validateCustomer(user.billing_id);
      if (isValid) return user.billing_id;
    }

    const customer = await StripePayment.createCustomer({
      user_id: user.id,
      name: user.name || user.email || 'Garage',
      email: user.email || '',
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { billing_id: customer.id },
    });

    return customer.id;
  }

  private async getOrCreatePendingCheckoutSubscription({
    user_id,
    plan,
    stripeCustomerId,
  }: {
    user_id: string;
    plan: {
      id: string;
      price_pence: number;
      currency: string;
    };
    stripeCustomerId: string;
  }) {
    const staleBefore = new Date(Date.now() - this.pendingCheckoutTtlMs);

    await this.prisma.subscription.updateMany({
      where: {
        user_id,
        status: SubscriptionStatus.INACTIVE,
        OR: [
          { plan_id: { not: plan.id } },
          { created_at: { lt: staleBefore } },
        ],
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancel_at: new Date(),
        cancellation_reason: 'Checkout abandoned or replaced',
      },
    });

    const reusableSubscription = await this.prisma.subscription.findFirst({
      where: {
        user_id,
        plan_id: plan.id,
        status: SubscriptionStatus.INACTIVE,
        created_at: { gte: staleBefore },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (reusableSubscription) {
      return await this.prisma.subscription.update({
        where: {
          id: reusableSubscription.id,
        },
        data: {
          price_pence: plan.price_pence,
          currency: plan.currency,
          stripe_customer_id: stripeCustomerId,
          cancellation_reason: null,
          cancel_at: null,
          cancel_at_period_end: false,
        },
      });
    }

    return await this.prisma.subscription.create({
      data: {
        user_id,
        plan_id: plan.id,
        status: SubscriptionStatus.INACTIVE,
        price_pence: plan.price_pence,
        currency: plan.currency,
        stripe_customer_id: stripeCustomerId,
      },
    });
  }

  private async findLatestSubscription(user_id: string) {
    return await this.prisma.subscription.findFirst({
      where: { user_id },
      include: this.subscriptionInclude(),
      orderBy: { created_at: 'desc' },
    });
  }

  private async findActiveAccessSubscription(user_id: string) {
    const now = new Date();

    return await this.prisma.subscription.findFirst({
      where: {
        user_id,
        OR: [
          {
            status: {
              in: [
                SubscriptionStatus.TRIALING,
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PAST_DUE,
                SubscriptionStatus.UNPAID,
                SubscriptionStatus.PAUSED,
                SubscriptionStatus.SUSPENDED,
              ],
            },
          },
          {
            status: SubscriptionStatus.CANCELLED,
            current_period_end: { gt: now },
          },
        ],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private async findManageableSubscription(user_id: string) {
    return await this.prisma.subscription.findFirst({
      where: {
        user_id,
        status: {
          in: [
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.UNPAID,
            SubscriptionStatus.PAUSED,
          ],
        },
      },
      include: this.subscriptionInclude(),
      orderBy: { created_at: 'desc' },
    });
  }

  private subscriptionInclude() {
    return {
      plan: {
        select: {
          id: true,
          name: true,
          price_pence: true,
          currency: true,
          trial_period_days: true,
        },
      },
    } satisfies Prisma.SubscriptionInclude;
  }

  private async createSubscriptionFromStripe(
    stripeSubscription: Stripe.Subscription,
    user_id: string,
    plan_id: string,
    stripeCustomerId: string | null,
    status: SubscriptionStatus,
    periods: {
      current_period_start: Date | null;
      current_period_end: Date | null;
    },
  ) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: plan_id },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return await this.prisma.subscription.create({
      data: {
        user_id,
        plan_id,
        status,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeCustomerId,
        price_pence: plan.price_pence,
        currency: plan.currency,
        current_period_start: periods.current_period_start,
        current_period_end: periods.current_period_end,
        next_billing_date: periods.current_period_end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false,
        cancel_at: stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000)
          : null,
      },
      include: this.subscriptionInclude(),
    });
  }

  private formatSubscription(subscription: SubscriptionWithPlan) {
    const trial = this.getTrialInformation(subscription);
    const cancellation = this.getCancellationInformation(subscription);
    const statusDetails = this.getStatusDetails(subscription);

    return {
      id: subscription.id,
      status: subscription.status,
      subscription_type: this.getSubscriptionType(subscription, trial),
      can_cancel:
        (
          [
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.UNPAID,
            SubscriptionStatus.PAUSED,
          ] as SubscriptionStatus[]
        ).includes(subscription.status) && !subscription.cancel_at_period_end,
      created_at: subscription.created_at,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price_pence: subscription.price_pence,
        currency: subscription.currency || subscription.plan.currency,
        price_formatted: this.formatPrice(
          subscription.price_pence,
          subscription.currency || subscription.plan.currency,
        ),
      },
      billing: {
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        next_billing_date: subscription.next_billing_date,
      },
      status_details: statusDetails,
      trial,
      cancellation,
      stripe_subscription_id: subscription.stripe_subscription_id,
    };
  }

  private getStatusDetails(subscription: SubscriptionWithPlan) {
    const now = Date.now();
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end).getTime()
      : null;
    const hasPeriodAccess = periodEnd ? periodEnd > now : false;
    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.ACTIVE,
    ];

    return {
      has_access:
        activeStatuses.includes(subscription.status) ||
        (subscription.status === SubscriptionStatus.CANCELLED &&
          hasPeriodAccess) ||
        subscription.status === SubscriptionStatus.PAST_DUE,
      will_renew:
        activeStatuses.includes(subscription.status) &&
        !subscription.cancel_at_period_end,
      cancellation_scheduled: Boolean(subscription.cancel_at_period_end),
      access_until: subscription.current_period_end,
    };
  }

  private getSubscriptionType(
    subscription: SubscriptionWithPlan,
    trial: ReturnType<typeof this.getTrialInformation>,
  ) {
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return subscription.current_period_end &&
        subscription.current_period_end > new Date()
        ? 'CANCELLED_WITH_ACCESS'
        : 'CANCELLED';
    }
    if (
      subscription.status === SubscriptionStatus.TRIALING ||
      trial?.is_active
    ) {
      return 'ACTIVE_TRIAL';
    }
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return 'ACTIVE_SUBSCRIPTION';
    }
    return subscription.status;
  }

  private getTrialInformation(subscription: SubscriptionWithPlan) {
    const trialDays = subscription.plan.trial_period_days || 0;
    if (!subscription.current_period_end || trialDays <= 0) return null;

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.current_period_end.getTime() - Date.now()) / 86_400_000,
      ),
    );
    const isActive =
      subscription.status === SubscriptionStatus.TRIALING ||
      (subscription.status === SubscriptionStatus.ACTIVE &&
        daysRemaining > 0 &&
        Date.now() - subscription.created_at.getTime() <
          (trialDays + 3) * 86_400_000);

    return {
      is_active: isActive,
      status: isActive ? 'ACTIVE' : 'EXPIRED',
      trial_end: subscription.current_period_end,
      days_remaining: daysRemaining,
    };
  }

  private getCancellationInformation(subscription: SubscriptionWithPlan) {
    const cancellationDate =
      subscription.cancel_at ||
      (subscription.cancel_at_period_end
        ? subscription.current_period_end
        : null);

    if (!cancellationDate) return null;

    return {
      cancellation_date: cancellationDate,
      days_until_cancellation: Math.max(
        0,
        Math.ceil((cancellationDate.getTime() - Date.now()) / 86_400_000),
      ),
      will_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      reason: subscription.cancellation_reason,
    };
  }

  private getPaymentFailureContext(subscription: SubscriptionWithPlan) {
    const gracePeriodEnd = new Date(
      subscription.updated_at.getTime() + 3 * 86_400_000,
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil((gracePeriodEnd.getTime() - Date.now()) / 86_400_000),
    );

    return {
      is_payment_failed: true,
      grace_period_active: daysRemaining > 0,
      grace_period_end: gracePeriodEnd,
      grace_period_days_remaining: daysRemaining,
      urgency_level:
        daysRemaining <= 1 ? 'high' : daysRemaining <= 2 ? 'medium' : 'low',
    };
  }

  private formatPrice(pricePence: number, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(pricePence / 100);
  }

  private getStripeSubscriptionId(session: Stripe.Checkout.Session) {
    if (!session.subscription) return null;
    return typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;
  }

  private getStripeCustomerId(stripeSubscription: Stripe.Subscription) {
    if (!stripeSubscription.customer) return null;
    return typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;
  }

  private extractStripePeriods(stripeSubscription: Stripe.Subscription) {
    const item = stripeSubscription.items?.data?.[0] as
      | (Stripe.SubscriptionItem & {
          current_period_start?: number;
          current_period_end?: number;
        })
      | undefined;
    const stripeWithLegacyPeriod = stripeSubscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
    };

    const start =
      item?.current_period_start ?? stripeWithLegacyPeriod.current_period_start;
    const end =
      item?.current_period_end ?? stripeWithLegacyPeriod.current_period_end;

    return {
      current_period_start: start ? new Date(start * 1000) : null,
      current_period_end: end ? new Date(end * 1000) : null,
    };
  }

  private mapStripeStatus(status: Stripe.Subscription.Status) {
    switch (status) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete_expired':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete':
        return SubscriptionStatus.INACTIVE;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }
}
