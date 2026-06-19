import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import { StripeWebhookResponseDto } from './dto/swagger/stripe-api.dto';

@ApiTags('Stripe')
@Controller('payment/stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  @apiTypedDoc(
    {
      summary: 'Handle Stripe webhook events',
      description: [
        'Subscription: checkout.session.*, customer.subscription.*',
        'Billing: invoice.payment_succeeded, invoice.payment_failed, invoice.payment_action_required',
        'Payments: payment_intent.*, charge.refunded',
      ].join(' '),
    },
    { type: StripeWebhookResponseDto },
  )
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const payload = req.rawBody?.toString();
    if (!payload) {
      throw new BadRequestException('Missing webhook payload raw body');
    }

    let event;
    try {
      event = await this.stripeService.handleWebhook(payload, signature);
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      throw new BadRequestException(
        `Webhook verification failed: ${error.message}`,
      );
    }

    try {
      this.logger.log(
        `Processing Stripe webhook event: ${event.type} (${event.id})`,
      );

      switch (event.type) {
        case 'customer.created':
          break;

        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
        case 'checkout.session.expired':
        case 'checkout.session.async_payment_failed':
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
        case 'customer.subscription.trial_will_end':
        case 'customer.subscription.paused':
        case 'customer.subscription.resumed':
          await this.stripeService.handleSubscriptionEvent(event);
          break;

        case 'invoice.payment_succeeded':
        case 'invoice.paid':
        case 'invoice.payment_failed':
        case 'invoice.payment_action_required':
          await this.stripeService.handleInvoiceEvent(event);
          break;

        case 'payment_intent.created':
          break;
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
        case 'payment_intent.requires_action':
          await this.stripeService.handlePaymentIntentEvent(event);
          break;

        case 'charge.refunded':
          await this.stripeService.handleChargeRefunded(event.data.object);
          break;

        case 'payout.paid':
          this.logger.log(`Payout paid: ${event.data.object.id}`);
          break;
        case 'payout.failed':
          this.logger.error(`Payout failed: ${event.data.object.id}`);
          break;

        default:
          this.logger.debug(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Failed to process Stripe webhook event ${event.type}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Webhook processing error: ${error.message}`,
      );
    }
  }
}
