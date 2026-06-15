import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { CancelSubscriptionDto } from './dto/update-subscription.dto';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const SUBSCRIPTION_PLAN = {
  id: 'clplan001',
  name: 'Garage Pro',
  description: 'Full access for garage operators',
  price_pence: 2999,
  currency: 'GBP',
  price_formatted: '£29.99',
  period_type: 'MONTHLY',
  trial_period_days: 14,
  is_checkout_ready: true,
  current_subscription: null,
};

const FORMATTED_SUBSCRIPTION = {
  id: 'clsub001',
  status: 'ACTIVE',
  subscription_type: 'STRIPE',
  can_cancel: true,
  created_at: '2026-01-01T00:00:00.000Z',
  plan: {
    id: 'clplan001',
    name: 'Garage Pro',
    price_pence: 2999,
    currency: 'GBP',
    price_formatted: '£29.99',
  },
  billing: {
    current_period_start: '2026-06-01T00:00:00.000Z',
    current_period_end: '2026-07-01T00:00:00.000Z',
    next_billing_date: '2026-07-01T00:00:00.000Z',
  },
  status_details: {
    has_access: true,
    will_renew: true,
    cancellation_scheduled: false,
    access_until: '2026-07-01T00:00:00.000Z',
  },
  trial: null,
  cancellation: null,
  stripe_subscription_id: 'sub_xxx',
};

const CHECKOUT = {
  checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_xxx',
  session_id: 'cs_test_xxx',
  subscription_id: 'clsub001',
};

const STATUS = {
  has_subscription: true,
  subscription: {
    id: 'clsub001',
    status: 'ACTIVE',
    plan_id: 'clplan001',
    plan_name: 'Garage Pro',
    price_pence: 2999,
    currency: 'GBP',
    price_formatted: '£29.99',
    has_access: true,
    current_period_end: '2026-07-01T00:00:00.000Z',
    cancel_at_period_end: false,
  },
};

const CANCEL = {
  subscription: FORMATTED_SUBSCRIPTION,
  effective_date: '2026-07-01T00:00:00.000Z',
  cancelled_immediately: false,
};

const SUCCESS = {
  session_id: 'cs_test_xxx',
  subscription: FORMATTED_SUBSCRIPTION,
};

@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiOperation({
    summary: 'List active plans',
    description: 'GARAGE + JWT. Each plan may include `current_subscription`.',
  })
  @ApiSuccessResponse({
    message: 'Subscription plans fetched successfully',
    data: [SUBSCRIPTION_PLAN],
    metaData: { page: 1, limit: 20, total: 2 },
  })
  @Get('plans')
  getActivePlans(
    @Query() query: QuerySubscriptionDto,
    @User('id') user_id: string,
  ) {
    return this.subscriptionService.getActivePlans(user_id, query);
  }

  @ApiOperation({
    summary: 'Subscribe or resubscribe',
    description:
      'GARAGE + JWT. Body: `plan_id`, optional `promo_code`. Returns Stripe `checkout_url`.',
  })
  @ApiSuccessResponse({
    message: 'Subscription checkout session created successfully',
    data: CHECKOUT,
  })
  @Put()
  subscribe(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @User('id') user_id: string,
  ) {
    return this.subscriptionService.subscribe(user_id, createSubscriptionDto);
  }

  @ApiOperation({
    summary: 'Get subscription status',
    description: 'GARAGE + JWT. `has_subscription` + short details.',
  })
  @ApiSuccessResponse({
    message: 'Subscription status fetched successfully',
    data: STATUS,
  })
  @Get('status')
  getSubscriptionStatus(@User('id') user_id: string) {
    return this.subscriptionService.getSubscriptionStatus(user_id);
  }

  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'GARAGE + JWT. `cancel_immediately` default false (period end). Optional `reason`.',
  })
  @ApiSuccessResponse({
    message:
      'Subscription cancellation scheduled for the end of the current billing period',
    data: CANCEL,
  })
  @Patch('cancel')
  cancelSubscription(
    @User('id') user_id: string,
    @Body() cancelSubscriptionDto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(
      user_id,
      cancelSubscriptionDto,
    );
  }

  @ApiOperation({
    summary: 'Validate checkout session',
    description: 'Public. Query `session_id` after Stripe redirect.',
  })
  @ApiSuccessResponse({
    message: 'Subscription checkout validated successfully',
    data: SUCCESS,
  })
  @Get('success')
  validateCheckoutSession(@Query('session_id') session_id: string) {
    return this.subscriptionService.validateCheckoutSession(session_id);
  }
}
