import { Injectable, Logger } from '@nestjs/common';
import { StripePayment } from '../../../common/lib/Payment/stripe/StripePayment';
import { SubscriptionService } from 'src/modules/application/subscription/subscription.service';
import type Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

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
        return await this.subscriptionService.applyStripeSubscriptionToLocalRecord(
          event.data.object as Stripe.Subscription,
          (event.data.object as Stripe.Subscription).metadata ?? {},
        );
      case 'customer.subscription.deleted':
        return await this.subscriptionService.markStripeSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
      default:
        this.logger.debug(`No subscription handler for ${event.type}`);
        return null;
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

    return await this.subscriptionService.applyStripeSubscriptionToLocalRecord(
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
