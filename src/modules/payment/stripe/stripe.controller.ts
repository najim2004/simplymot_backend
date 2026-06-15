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
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Stripe')
@Controller('payment/stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
  ) {}

  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiOkResponse({
    schema: {
      example: { received: true },
    },
  })
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
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BadRequestException(`Webhook verification failed: ${error.message}`);
    }

    try {
      this.logger.log(`Processing Stripe webhook event: ${event.type} (${event.id})`);

      // Handle events
      switch (event.type) {
        case 'customer.created':
          break;
        case 'checkout.session.completed':
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.stripeService.handleSubscriptionEvent(event);
          break;
        case 'payment_intent.created':
          break;
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
        case 'payment_intent.requires_action':
          await this.stripeService.handlePaymentIntentEvent(event);
          break;
        case 'payout.paid':
          const paidPayout = event.data.object;
          this.logger.log(`Payout paid: ${paidPayout.id}`);
          break;
        case 'payout.failed':
          const failedPayout = event.data.object;
          this.logger.error(`Payout failed: ${failedPayout.id}`);
          break;
        default:
          this.logger.debug(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Failed to process Stripe webhook event ${event.type}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Webhook processing error: ${error.message}`);
    }
  }
}
