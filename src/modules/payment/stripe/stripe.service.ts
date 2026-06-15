import { Injectable, Logger } from '@nestjs/common';
import { StripePayment } from '../../../common/lib/Payment/stripe/StripePayment';
import { SubscriptionRepository } from 'src/common/repository/subscription/subscription.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import type Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async handleWebhook(rawBody: string, sig: string | string[]) {
    return StripePayment.handleWebhook(rawBody, sig);
  }

  async handleSubscriptionEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        return await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return await this.subscriptionRepository.applyStripeSubscriptionToLocalRecord(
          event.data.object as Stripe.Subscription,
          (event.data.object as Stripe.Subscription).metadata ?? {},
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

  async handlePaymentIntentEvent(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const referenceNumber = paymentIntent.id;

    // Map Stripe status to database enum PaymentTransactionStatus
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
}
