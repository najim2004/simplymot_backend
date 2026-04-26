import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import {
  CancelSubscriptionDto,
  QueryAvailableSubscriptionPlansDto,
  SubscriptionCheckoutDto,
} from './dto/create-subscription.dto';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Subscription')
@ApiBearerAuth()
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiSuccessResponse({
    summary: 'List available subscription plans',
    message: 'Subscription plans fetched successfully',
    data: [],
    metaData: { page: 1, limit: 20, total: 1 },
  })
  @Get('plans')
  getAvailablePlans(@Query() query: QueryAvailableSubscriptionPlansDto) {
    return this.subscriptionService.getAvailablePlans(query);
  }

  @ApiSuccessResponse({
    summary: 'Get current subscription',
    message: 'Subscription fetched successfully',
    data: { id: 'subscription_id', status: 'ACTIVE' },
    includeAuthErrors: true,
  })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentSubscription(@User('id') user_id: string) {
    return this.subscriptionService.getCurrentSubscription(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Create subscription checkout session',
    message: 'Subscription checkout session created successfully',
    data: {
      checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_xxx',
      session_id: 'cs_test_xxx',
      subscription_id: 'subscription_id',
    },
    includeAuthErrors: true,
  })
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckoutSession(
    @User('id') user_id: string,
    @Body() checkoutDto: SubscriptionCheckoutDto,
  ) {
    return this.subscriptionService.createCheckoutSession(user_id, checkoutDto);
  }

  @ApiSuccessResponse({
    summary: 'Create billing portal session',
    message: 'Billing portal session created successfully',
    data: { url: 'https://billing.stripe.com/session/test' },
    includeAuthErrors: true,
  })
  @Post('billing-portal')
  @UseGuards(JwtAuthGuard)
  createBillingPortalSession(@User('id') user_id: string) {
    return this.subscriptionService.createBillingPortalSession(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Cancel subscription',
    message:
      'Subscription cancellation scheduled for the end of the current billing period',
    data: {
      subscription: { id: 'subscription_id' },
      cancelled_immediately: false,
    },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancelSubscription(
    @User('id') user_id: string,
    @Body() cancelDto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(user_id, cancelDto);
  }

  @ApiSuccessResponse({
    summary: 'Validate subscription checkout session',
    message: 'Subscription checkout validated successfully',
    data: {
      session_id: 'cs_test_xxx',
      subscription: { id: 'subscription_id' },
    },
  })
  @Get('success')
  validateCheckoutSession(@Query('session_id') session_id: string) {
    return this.subscriptionService.validateCheckoutSession(session_id);
  }
}
