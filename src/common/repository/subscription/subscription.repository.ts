import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionStatus } from 'prisma/generated/enums';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';

// ─── Local Types ────────────────────────────────────────────────────────────

type SubscriptionWithPlan = {
  id: string;
  status: string;
  price_pence: number;
  currency: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  next_billing_date: Date | null;
  cancel_at: Date | null;
  cancel_at_period_end: boolean | null;
  cancellation_reason: string | null;
  stripe_subscription_id: string | null;
  created_at: Date;
  plan: {
    id: string;
    name: string;
    price_pence: number;
    currency: string;
    trial_period_days?: number;
  };
};

type VisibilityStatus = {
  hasSubscription: boolean;
  expiresAt: Date | null;
};

// ─── Repository ─────────────────────────────────────────────────────────────

@Injectable()
export class SubscriptionRepository {
  private readonly logger = new Logger(SubscriptionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async hasActiveSubscriptionAccess(user_id: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        user_id,
        status: {
          in: [
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.CANCELLED,
          ],
        },
      },
      orderBy: { created_at: 'desc' },
      select: {
        status: true,
        current_period_end: true,
      },
    });

    if (!subscription) {
      return false;
    }

    const periodEnd = subscription.current_period_end
      ? subscription.current_period_end.getTime()
      : null;
    const hasPeriodAccess = periodEnd ? periodEnd > Date.now() : false;
    const activeStatuses = [
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.ACTIVE,
    ];

    return (
      activeStatuses.includes(subscription.status) ||
      (subscription.status === SubscriptionStatus.CANCELLED &&
        hasPeriodAccess) ||
      subscription.status === SubscriptionStatus.PAST_DUE
    );
  }

  // Retrieves the user's latest relevant subscription with a background Stripe sync
  async getCurrentSubscription(user_id: string): Promise<SubscriptionWithPlan> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        user_id,
        status: { in: ['ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'] },
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
      orderBy: { created_at: 'desc' },
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // Fire-and-forget: sync dates from Stripe without blocking the response
    if (subscription.stripe_subscription_id) {
      this.syncSubscription(user_id, subscription.id).catch((err) =>
        this.logger.warn(`Background Stripe sync failed: ${err.message}`),
      );
    }

    return subscription as SubscriptionWithPlan;
  }

  async cancelActiveSubscriptionsForUser(
    user_id: string,
    reason = 'User banned by admin',
    cancelAtPeriodEnd = false,
  ): Promise<number> {
    const activeStatuses = [
      'TRIALING',
      'ACTIVE',
      'PAST_DUE',
      'UNPAID',
      'PAUSED',
      'SUSPENDED',
    ];

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        user_id,
        status: { in: activeStatuses as any },
      },
      select: {
        id: true,
        stripe_subscription_id: true,
      },
    });

    if (!subscriptions.length) return 0;

    for (const subscription of subscriptions) {
      if (subscription.stripe_subscription_id) {
        try {
          if (cancelAtPeriodEnd) {
            await StripePayment.cancelSubscriptionAtPeriodEnd(
              subscription.stripe_subscription_id,
            );
          } else {
            await StripePayment.cancelSubscription(
              subscription.stripe_subscription_id,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Stripe cancel failed for sub ${subscription.id}: ${error.message}`,
          );
        }
      }
    }

    await this.prisma.subscription.updateMany({
      where: {
        id: { in: subscriptions.map((item) => item.id) },
      },
      data: {
        status: cancelAtPeriodEnd ? ('ACTIVE' as any) : ('CANCELLED' as any),
        cancel_at: cancelAtPeriodEnd ? null : new Date(),
        cancel_at_period_end: cancelAtPeriodEnd,
        cancellation_reason: reason,
      },
    });

    return subscriptions.length;
  }

  // Pulls latest billing period dates from Stripe and persists them locally
  async syncSubscription(
    user_id: string,
    subscription_id: string,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscription_id, user_id },
    });

    if (!subscription?.stripe_subscription_id) {
      this.logger.warn(
        `Subscription ${subscription_id} has no Stripe ID — skipping sync`,
      );
      return;
    }

    const stripeSub = (await StripePayment.retrieveSubscription(
      subscription.stripe_subscription_id,
    )) as Stripe.Subscription;

    const item = stripeSub.items.data[0];
    if (!item?.current_period_start || !item?.current_period_end) {
      this.logger.warn(
        `Missing period dates in Stripe sub ${subscription.stripe_subscription_id}`,
      );
      return;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        current_period_start: new Date(item.current_period_start * 1000),
        current_period_end: new Date(item.current_period_end * 1000),
        next_billing_date: new Date(item.current_period_end * 1000),
      },
    });

    this.logger.log(`🔄 Synced sub dates for user ${user_id}`);
  }

  // Shapes a raw subscription record into a clean API response
  formatSubscription(
    subscription: SubscriptionWithPlan,
    visibility: VisibilityStatus,
  ) {
    const trial = this.getTrialInformation(subscription);
    const cancellation = this.getCancellationInformation(subscription);

    return {
      id: subscription.id,
      status: subscription.status.toUpperCase(),
      subscription_type: this.determineSubscriptionType(subscription, trial),
      can_cancel: subscription.status === 'ACTIVE' && !cancellation,
      created_at: subscription.created_at,

      billing: {
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        next_billing_date: subscription.next_billing_date,
      },

      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        currency: subscription.plan.currency,
        price_pence: subscription.price_pence,
        price_formatted: this.formatPrice(
          subscription.price_pence,
          subscription.plan.currency,
        ),
      },

      ...(trial && { trial }),
      ...(cancellation && { cancellation }),

      visibility: {
        is_visible_to_drivers: visibility.hasSubscription,
        visible_until: visibility.expiresAt,
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private formatPrice(pence: number, currency: string): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(pence / 100);
  }

  private determineSubscriptionType(
    subscription: SubscriptionWithPlan,
    trial: ReturnType<typeof this.getTrialInformation>,
  ): string {
    const { status } = subscription;

    if (status === 'CANCELLED') return 'CANCELLED_WITH_ACCESS';
    if (status === 'ACTIVE')
      return trial?.is_active ? 'ACTIVE_TRIAL' : 'ACTIVE_SUBSCRIPTION';
    if (status === 'PAST_DUE') return 'PAST_DUE';
    if (status === 'SUSPENDED') return 'SUSPENDED';
    return 'INACTIVE';
  }

  private getTrialInformation(subscription: SubscriptionWithPlan) {
    const trialDays = subscription.plan?.trial_period_days ?? 0;

    if (!subscription.current_period_end || trialDays <= 0) return null;

    const MS_PER_DAY = 864_00_000; // 1000 * 60 * 60 * 24
    const now = Date.now();

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(subscription.current_period_end).getTime() - now) /
          MS_PER_DAY,
      ),
    );

    const isWithinTrialAge =
      now - new Date(subscription.created_at).getTime() <
      (trialDays + 3) * MS_PER_DAY;

    const is_active =
      subscription.status === 'ACTIVE' &&
      !!subscription.stripe_subscription_id &&
      daysRemaining > 0 &&
      isWithinTrialAge;

    return {
      is_active,
      status: is_active ? 'ACTIVE' : 'EXPIRED',
      trial_end: subscription.current_period_end,
      days_remaining: daysRemaining,
    };
  }

  private getCancellationInformation(subscription: SubscriptionWithPlan) {
    const cancelDate =
      subscription.cancel_at ||
      (subscription.cancel_at_period_end
        ? subscription.current_period_end
        : null);

    if (!cancelDate) return null;

    return {
      cancellation_date: cancelDate,
      days_until_cancellation: Math.max(
        0,
        Math.ceil((new Date(cancelDate).getTime() - Date.now()) / 864_00_000),
      ),
      will_cancel_at_period_end: !!subscription.cancel_at_period_end,
      reason: subscription.cancellation_reason ?? null,
    };
  }
}
