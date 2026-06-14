import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { CancelSubscriptionDto } from './dto/update-subscription.dto';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiSuccessResponse({
    summary: 'List active subscription plans',
    message: 'Subscription plans fetched successfully',
    data: [],
    metaData: { page: 1, limit: 20, total: 1 },
    includeAuthErrors: true,
  })
  @Get('plans')
  getActivePlans(
    @Query() query: QuerySubscriptionDto,
    @User('id') user_id: string,
  ) {
    return this.subscriptionService.getActivePlans(user_id, query);
  }

  @ApiSuccessResponse({
    summary: 'Subscribe or resubscribe',
    message: 'Subscription checkout session created successfully',
    data: {
      checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_xxx',
      session_id: 'cs_test_xxx',
      subscription_id: 'subscription_id',
    },
    includeAuthErrors: true,
  })
  @Put()
  subscribe(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @User('id') user_id: string,
  ) {
    return this.subscriptionService.subscribe(user_id, createSubscriptionDto);
  }

  @ApiSuccessResponse({
    summary: 'Get subscription status',
    message: 'Subscription status fetched successfully',
    data: { has_subscription: true },
    includeAuthErrors: true,
  })
  @Get('status')
  getSubscriptionStatus(@User('id') user_id: string) {
    return this.subscriptionService.getSubscriptionStatus(user_id);
  }

  @ApiSuccessResponse({
    summary: 'Cancel subscription',
    message: 'Subscription cancelled successfully',
    data: {
      subscription: { id: 'subscription_id' },
      cancelled_immediately: false,
    },
    includeAuthErrors: true,
    includeNotFound: true,
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
