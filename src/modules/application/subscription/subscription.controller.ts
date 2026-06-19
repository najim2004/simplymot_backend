import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { CancelSubscriptionDto } from './dto/update-subscription.dto';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  CancelSubscriptionResponseDto,
  ListSubscriptionPlansResponseDto,
  SubscribeResponseDto,
  SubscriptionStatusResponseDto,
  ValidateCheckoutSessionResponseDto,
} from './dto/swagger/subscription-api.dto';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @apiTypedDoc(
    {
      summary: 'List active plans',
      description: 'GARAGE + JWT. Each plan may include `current_subscription`.',
    },
    { type: ListSubscriptionPlansResponseDto },
  )
  @Get('plans')
  getActivePlans(
    @Query() query: QuerySubscriptionDto,
    @User('id') user_id: string,
  ) {
    return this.subscriptionService.getActivePlans(user_id, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @apiTypedDoc(
    {
      summary: 'Subscribe or resubscribe',
      description:
        'GARAGE + JWT. Body: `plan_id`, optional `promo_code`. Returns Stripe `checkout_url`.',
    },
    { type: SubscribeResponseDto },
  )
  @Put()
  subscribe(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @User('id') user_id: string,
  ) {
    return this.subscriptionService.subscribe(user_id, createSubscriptionDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @apiTypedDoc(
    {
      summary: 'Get subscription status',
      description: 'GARAGE + JWT. `has_subscription` + short details.',
    },
    { type: SubscriptionStatusResponseDto },
  )
  @Get('status')
  getSubscriptionStatus(@User('id') user_id: string) {
    return this.subscriptionService.getSubscriptionStatus(user_id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @apiTypedDoc(
    {
      summary: 'Cancel subscription',
      description:
        'GARAGE + JWT. `cancel_immediately` default false (period end). Optional `reason`.',
    },
    { type: CancelSubscriptionResponseDto },
  )
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

  @ApiQuery({
    name: 'session_id',
    required: true,
    description: 'Stripe checkout session id from redirect URL',
    example: 'cs_test_xxx',
  })
  @apiTypedDoc(
    {
      summary: 'Validate checkout session',
      description:
        'Public. Query `session_id` after Stripe redirect. No JWT required.',
    },
    { type: ValidateCheckoutSessionResponseDto },
  )
  @Get('success')
  validateCheckoutSession(@Query('session_id') session_id: string) {
    return this.subscriptionService.validateCheckoutSession(session_id);
  }
}
