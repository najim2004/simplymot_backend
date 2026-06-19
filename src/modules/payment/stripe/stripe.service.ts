import { Injectable, Logger } from '@nestjs/common';
import { StripePayment } from '../../../common/lib/Payment/stripe/StripePayment';
import { SubscriptionRepository } from 'src/common/repository/subscription/subscription.repository';
import { InvoiceRepository } from 'src/common/repository/invoice/invoice.repository';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { PaymentTransactionStatus } from 'prisma/generated/enums';
import type Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async handleWebhook(rawBody: string, sig: string | string[]) {
    return StripePayment.handleWebhook(rawBody, sig);
  }

  async handleSubscriptionEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
      case 'checkout.session.expired':
        return await this.handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
      case 'checkout.session.async_payment_failed':
        return await this.handleCheckoutSessionAsyncPaymentFailed(
          event.data.object as Stripe.Checkout.Session,
        );
      case 'customer.subscription.trial_will_end':
        return await this.handleTrialWillEnd(
          event.data.object as Stripe.Subscription,
        );
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        return await this.subscriptionRepository.applyStripeSubscriptionToLocalRecord(
          event.data.object as Stripe.Subscription,
          this.subscriptionHintsFromMetadata(
            (event.data.object as Stripe.Subscription).metadata,
          ),
        );
      case 'customer.subscription.deleted':
        return await this.subscriptionRepository.markStripeSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
      default:
        this.logger.debug(`No subscription handler for ${event.type}`);
        return null;
    }
  }

  async handleInvoiceEvent(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;

    switch (event.type) {
      case 'invoice.payment_succeeded':
      case 'invoice.paid':
        return await this.handleInvoicePaymentSucceeded(invoice);
      case 'invoice.payment_failed':
        return await this.handleInvoicePaymentFailed(invoice);
      case 'invoice.payment_action_required':
        return await this.handleInvoicePaymentActionRequired(invoice);
      default:
        this.logger.debug(`No invoice handler for ${event.type}`);
        return null;
    }
  }

  async handleChargeRefunded(charge: Stripe.Charge) {
    const references = this.collectChargeReferenceNumbers(charge);
    if (!references.length) {
      return null;
    }

    const result = await this.prisma.paymentTransaction.updateMany({
      where: {
        reference_number: { in: references },
        deleted_at: null,
        status: { not: PaymentTransactionStatus.REFUNDED },
      },
      data: {
        status: PaymentTransactionStatus.REFUNDED,
        raw_status: 'refunded',
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Marked ${result.count} transaction(s) as REFUNDED for charge ${charge.id}`,
      );
    }

    return result;
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = this.extractStripeSubscriptionId(invoice);
    if (!stripeSubscriptionId) {
      this.logger.warn(
        `Invoice ${invoice.id} has no subscription reference — skipping billing records`,
      );
      return null;
    }

    const stripeSubscription =
      await StripePayment.retrieveSubscription(stripeSubscriptionId);

    const subscription = await this.resolveLocalSubscription(
      stripeSubscriptionId,
      stripeSubscription,
    );

    if (!subscription) {
      this.logger.warn(
        `No local subscription found for Stripe subscription ${stripeSubscriptionId}`,
      );
      return null;
    }

    await this.subscriptionRepository.applyStripeSubscriptionToLocalRecord(
      stripeSubscription,
      {
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        plan_id: subscription.plan_id,
        stripe_promotion_code_id:
          stripeSubscription.metadata?.stripe_promotion_code_id ?? null,
      },
    );

    const amountPaidCents = invoice.amount_paid ?? 0;
    if (amountPaidCents <= 0) {
      this.logger.debug(
        `Invoice ${invoice.id} has no charge amount — subscription synced only`,
      );
      return null;
    }

    const garage = await this.prisma.garage.findFirst({
      where: { owner_id: subscription.user_id },
      select: { id: true },
    });

    const paidAt = invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date();
    const issuedAt = invoice.created
      ? new Date(invoice.created * 1000)
      : paidAt;

    const amountPaid = amountPaidCents / 100;
    const subtotalAmount = (invoice.subtotal ?? amountPaidCents) / 100;
    const taxAmount = this.sumTaxAmounts(invoice);
    const discountAmount = this.sumDiscountAmounts(invoice);

    const result = await this.invoiceRepository.recordSubscriptionPayment({
      subscriptionId: subscription.id,
      userId: subscription.user_id,
      planId: subscription.plan.id,
      planName: subscription.plan.name,
      garageId: garage?.id ?? null,
      stripeInvoiceId: invoice.id,
      amountPaid,
      currency: invoice.currency,
      subtotalAmount,
      discountAmount,
      taxAmount,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
      billingReason: invoice.billing_reason ?? null,
      membershipPeriodLabel: this.formatMembershipPeriod(
        invoice,
        stripeSubscription,
      ),
      paidAt,
      issuedAt,
    });

    if (result.created) {
      this.logger.log(
        `Recorded subscription payment for invoice ${invoice.id} (local invoice=${result.invoiceId}, transaction=${result.transactionId})`,
      );
    }

    return result;
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = this.extractStripeSubscriptionId(invoice);
    if (!stripeSubscriptionId) {
      this.logger.warn(
        `Invoice ${invoice.id} has no subscription reference — skipping payment failure handling`,
      );
      return null;
    }

    const stripeSubscription =
      await StripePayment.retrieveSubscription(stripeSubscriptionId);

    const subscription = await this.resolveLocalSubscription(
      stripeSubscriptionId,
      stripeSubscription,
    );

    if (!subscription) {
      this.logger.warn(
        `No local subscription found for failed invoice ${invoice.id}`,
      );
      return null;
    }

    const updatedSubscription =
      await this.subscriptionRepository.applySubscriptionPaymentFailure(
        stripeSubscription,
        {
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          stripe_invoice_id: invoice.id,
          amount_due_cents: invoice.amount_due ?? null,
          currency: invoice.currency ?? null,
        },
      );

    const amountDueCents = invoice.amount_due ?? 0;
    if (amountDueCents > 0) {
      await this.invoiceRepository.recordSubscriptionPaymentFailure({
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        stripeInvoiceId: invoice.id,
        amountDue: amountDueCents / 100,
        currency: invoice.currency,
        failureReason: this.getPaymentFailureReason(invoice),
      });
    }

    this.logger.warn(
      `Handled subscription payment failure for invoice ${invoice.id} (subscription=${updatedSubscription.id}, status=${updatedSubscription.status})`,
    );

    return updatedSubscription;
  }

  async handleInvoicePaymentActionRequired(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = this.extractStripeSubscriptionId(invoice);
    if (!stripeSubscriptionId) {
      return null;
    }

    const stripeSubscription =
      await StripePayment.retrieveSubscription(stripeSubscriptionId);
    const subscription = await this.resolveLocalSubscription(
      stripeSubscriptionId,
      stripeSubscription,
    );

    if (!subscription) {
      return null;
    }

    await this.subscriptionRepository.applyStripeSubscriptionToLocalRecord(
      stripeSubscription,
      {
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        plan_id: subscription.plan_id,
      },
    );

    await this.notifySubscriptionUser(
      subscription.user_id,
      subscription.id,
      'SUBSCRIPTION',
      'Action required to complete your subscription payment. Please update your payment method in the billing portal.',
    );

    return subscription;
  }

  async handleTrialWillEnd(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.resolveLocalSubscription(
      stripeSubscription.id,
      stripeSubscription,
    );

    if (!subscription) {
      this.logger.warn(
        `No local subscription found for trial_will_end: ${stripeSubscription.id}`,
      );
      return null;
    }

    await this.subscriptionRepository.applyStripeSubscriptionToLocalRecord(
      stripeSubscription,
      {
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        plan_id: subscription.plan_id,
        stripe_promotion_code_id:
          stripeSubscription.metadata?.stripe_promotion_code_id ?? null,
      },
    );

    const trialEnd = stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null;
    const daysRemaining = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000))
      : 0;

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: subscription.plan_id },
      select: { name: true },
    });

    await this.notifySubscriptionUser(
      subscription.user_id,
      subscription.id,
      'SUBSCRIPTION',
      `Your trial for the "${plan?.name ?? 'subscription'}" plan ends in ${daysRemaining} day(s). Add a payment method to continue.`,
    );

    return subscription;
  }

  async handlePaymentIntentEvent(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    if (
      paymentIntent.metadata?.source === 'garage_subscription' ||
      paymentIntent.metadata?.subscription_id
    ) {
      this.logger.debug(
        `Skipping payment_intent ${paymentIntent.id} — subscription charges are recorded via invoice webhooks`,
      );
      return;
    }

    const referenceNumber = paymentIntent.id;

    let dbStatus: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' = 'PENDING';
    if (event.type === 'payment_intent.succeeded') {
      dbStatus = 'PAID';
    } else if (event.type === 'payment_intent.payment_failed') {
      dbStatus = 'FAILED';
    } else if (event.type === 'payment_intent.canceled') {
      dbStatus = 'CANCELLED';
    } else if (event.type === 'payment_intent.requires_action') {
      dbStatus = 'PENDING';
    }

    const updateResult = await this.transactionRepository.updateTransaction({
      reference_number: referenceNumber,
      status: dbStatus,
      paid_amount: dbStatus === 'PAID' ? paymentIntent.amount / 100 : undefined,
      paid_currency: dbStatus === 'PAID' ? paymentIntent.currency : undefined,
      raw_status: paymentIntent.status,
    });

    if (updateResult.count === 0) {
      this.logger.log(
        `No local transaction record found for reference_number ${referenceNumber}. Creating new ${dbStatus} transaction log.`,
      );

      let userId = null;
      let kind = 'ORDER';

      if (paymentIntent.customer) {
        const stripeCustomerId =
          typeof paymentIntent.customer === 'string'
            ? paymentIntent.customer
            : paymentIntent.customer.id;

        const user = await this.prisma.user.findFirst({
          where: { billing_id: stripeCustomerId },
          select: { id: true },
        });
        if (user) {
          userId = user.id;
        }
      }

      let entityId = null;
      if (
        paymentIntent.metadata?.source === 'garage_subscription' ||
        paymentIntent.metadata?.subscription_id
      ) {
        kind = 'SUBSCRIPTION';
        entityId = paymentIntent.metadata?.subscription_id || null;
      }

      await this.prisma.paymentTransaction.create({
        data: {
          user_id: userId,
          entity_id: entityId,
          kind: kind as any,
          provider: 'stripe',
          reference_number: referenceNumber,
          status: dbStatus,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          paid_amount: dbStatus === 'PAID' ? paymentIntent.amount / 100 : null,
          paid_currency: dbStatus === 'PAID' ? paymentIntent.currency : null,
          raw_status: paymentIntent.status,
          booking_id: paymentIntent.metadata?.booking_id || null,
        },
      });
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!stripeSubscriptionId) {
      this.logger.warn(`Checkout session ${session.id} has no subscription`);
      return null;
    }

    const stripeSubscription =
      await StripePayment.retrieveSubscription(stripeSubscriptionId);

    return await this.subscriptionRepository.applyStripeSubscriptionToLocalRecord(
      stripeSubscription,
      {
        subscription_id: session.metadata?.subscription_id,
        user_id: session.metadata?.user_id,
        plan_id: session.metadata?.plan_id,
        stripe_promotion_code_id: session.metadata?.stripe_promotion_code_id,
      },
    );
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    const subscriptionId = session.metadata?.subscription_id;
    if (!subscriptionId) {
      return null;
    }

    await this.subscriptionRepository.abandonPendingCheckoutSubscription(
      subscriptionId,
      'Checkout session expired',
    );

    return { subscription_id: subscriptionId };
  }

  private async handleCheckoutSessionAsyncPaymentFailed(
    session: Stripe.Checkout.Session,
  ) {
    const subscriptionId = session.metadata?.subscription_id;
    if (!subscriptionId) {
      return null;
    }

    await this.subscriptionRepository.abandonPendingCheckoutSubscription(
      subscriptionId,
      'Async checkout payment failed',
    );

    const userId = session.metadata?.user_id;
    if (userId) {
      await this.notifySubscriptionUser(
        userId,
        subscriptionId,
        'SUBSCRIPTION',
        'Your subscription checkout payment failed. Please try again.',
      );
    }

    return { subscription_id: subscriptionId };
  }

  private subscriptionHintsFromMetadata(metadata?: Stripe.Metadata | null) {
    return {
      subscription_id: metadata?.subscription_id ?? null,
      user_id: metadata?.user_id ?? null,
      plan_id: metadata?.plan_id ?? null,
      stripe_promotion_code_id: metadata?.stripe_promotion_code_id ?? null,
    };
  }

  private async notifySubscriptionUser(
    receiverId: string,
    entityId: string,
    type: string,
    text: string,
  ) {
    try {
      await this.notificationRepository.createNotification({
        receiver_id: receiverId,
        entity_id: entityId,
        type,
        text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to create subscription notification: ${message}`,
      );
    }
  }

  private collectChargeReferenceNumbers(charge: Stripe.Charge) {
    const references = new Set<string>([charge.id]);

    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (paymentIntentId) {
      references.add(paymentIntentId);
    }

    return [...references];
  }

  private async resolveLocalSubscription(
    stripeSubscriptionId: string,
    stripeSubscription: Stripe.Subscription,
  ) {
    const metadata = stripeSubscription.metadata ?? {};

    return this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripe_subscription_id: stripeSubscriptionId },
          ...(metadata.subscription_id
            ? [{ id: metadata.subscription_id }]
            : []),
        ],
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private extractStripeSubscriptionId(invoice: Stripe.Invoice): string | null {
    const parentSubscription =
      invoice.parent?.subscription_details?.subscription;
    if (typeof parentSubscription === 'string') {
      return parentSubscription;
    }
    if (parentSubscription && typeof parentSubscription === 'object') {
      return parentSubscription.id;
    }

    const legacyInvoice = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription;
    };
    if (typeof legacyInvoice.subscription === 'string') {
      return legacyInvoice.subscription;
    }
    if (
      legacyInvoice.subscription &&
      typeof legacyInvoice.subscription === 'object'
    ) {
      return legacyInvoice.subscription.id;
    }

    const lineSubscription = invoice.lines?.data?.[0]?.subscription;
    if (typeof lineSubscription === 'string') {
      return lineSubscription;
    }

    return null;
  }

  private sumTaxAmounts(invoice: Stripe.Invoice): number {
    const taxes = invoice.total_taxes ?? [];
    const totalCents = taxes.reduce(
      (sum, entry) => sum + (entry.amount ?? 0),
      0,
    );
    return totalCents / 100;
  }

  private sumDiscountAmounts(invoice: Stripe.Invoice): number {
    const discounts = invoice.total_discount_amounts ?? [];
    const totalCents = discounts.reduce(
      (sum, entry) => sum + (entry.amount ?? 0),
      0,
    );
    return totalCents / 100;
  }

  private formatMembershipPeriod(
    invoice: Stripe.Invoice,
    stripeSubscription: Stripe.Subscription,
  ): string | null {
    const period = this.resolveSubscriptionPeriod(stripeSubscription);
    if (period) {
      return `${this.formatDisplayDate(period.start)} - ${this.formatDisplayDate(period.end)}`;
    }

    const linePeriod = invoice.lines?.data?.[0]?.period;
    if (linePeriod?.start && linePeriod?.end) {
      return `${this.formatDisplayDate(new Date(linePeriod.start * 1000))} - ${this.formatDisplayDate(new Date(linePeriod.end * 1000))}`;
    }

    if (invoice.period_start && invoice.period_end) {
      return `${this.formatDisplayDate(new Date(invoice.period_start * 1000))} - ${this.formatDisplayDate(new Date(invoice.period_end * 1000))}`;
    }

    return null;
  }

  private resolveSubscriptionPeriod(stripeSubscription: Stripe.Subscription) {
    const item = stripeSubscription.items?.data?.[0];
    const startSeconds =
      item?.current_period_start ??
      (
        stripeSubscription as Stripe.Subscription & {
          current_period_start?: number;
        }
      ).current_period_start;
    const endSeconds =
      item?.current_period_end ??
      (
        stripeSubscription as Stripe.Subscription & {
          current_period_end?: number;
        }
      ).current_period_end;

    if (!startSeconds || !endSeconds) {
      return null;
    }

    return {
      start: new Date(startSeconds * 1000),
      end: new Date(endSeconds * 1000),
    };
  }

  private formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private getPaymentFailureReason(invoice: Stripe.Invoice): string | null {
    const paymentIntent = invoice.payments?.data?.[0]?.payment;
    if (
      paymentIntent &&
      typeof paymentIntent === 'object' &&
      'last_payment_error' in paymentIntent &&
      paymentIntent.last_payment_error &&
      typeof paymentIntent.last_payment_error === 'object' &&
      'message' in paymentIntent.last_payment_error
    ) {
      return String(paymentIntent.last_payment_error.message);
    }

    return invoice.last_finalization_error?.message ?? 'payment_failed';
  }
}
