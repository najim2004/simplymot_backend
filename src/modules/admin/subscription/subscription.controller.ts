import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { QuerySubscriptionPlanDto } from './dto/query-subscription.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const SUBSCRIPTION_PLAN = {
  id: 'clplan001',
  name: 'Garage Pro',
  description: 'Full access',
  price_pence: 2999,
  period_type: 'MONTHLY',
  trial_period_days: 14,
  currency: 'GBP',
  status: 'ACTIVE',
  created_at: '2026-01-01T00:00:00.000Z',
};

@ApiTags('Admin Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiOperation({
    summary: 'Create subscription plan',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Subscription plan created successfully',
    status: HttpStatus.CREATED,
    data: SUBSCRIPTION_PLAN,
  })
  @Post('plan')
  createSubscriptionPlan(
    @Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptionService.createSubscriptionPlan(
      createSubscriptionPlanDto,
    );
  }

  @ApiOperation({
    summary: 'List subscription plans',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Subscription plans fetched successfully',
    data: [SUBSCRIPTION_PLAN],
    metaData: { total: 3, page: 1, limit: 10, pages: 1 },
  })
  @Get('plan')
  getAllSubscriptionPlans(@Query() query: QuerySubscriptionPlanDto) {
    return this.subscriptionService.getAllSubscriptionPlans(query);
  }

  @ApiOperation({
    summary: 'Sync plan with Stripe',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Subscription plan synced with Stripe successfully',
    data: {
      ...SUBSCRIPTION_PLAN,
      stripe_price_id: 'price_xxx',
      stripe_product_id: 'prod_xxx',
    },
  })
  @Post('plan/:plan_id/stripe/sync')
  syncStripeSubscriptionPlans(@Param('plan_id') plan_id: string) {
    return this.subscriptionService.syncStripeSubscriptionPlans(plan_id);
  }

  @ApiOperation({
    summary: 'Get subscription plan',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Subscription plan fetched successfully',
    data: {
      ...SUBSCRIPTION_PLAN,
      subscriptions_by_status: { ACTIVE: 12, CANCELLED: 3 },
      total_subscriptions: 15,
    },
  })
  @Get('plan/:plan_id')
  getOneSubscriptionPlan(@Param('plan_id') plan_id: string) {
    return this.subscriptionService.getOneSubscriptionPlan(plan_id);
  }

  @ApiOperation({
    summary: 'Update subscription plan',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Subscription plan updated successfully',
    data: SUBSCRIPTION_PLAN,
  })
  @Patch('plan/:plan_id')
  updateSubscriptionPlan(
    @Param('plan_id') plan_id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.updateSubscriptionPlan(
      plan_id,
      updateSubscriptionDto,
    );
  }

  @ApiOperation({
    summary: 'Delete subscription plan',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Subscription plan deleted successfully',
    data: SUBSCRIPTION_PLAN,
  })
  @Delete('plan/:plan_id')
  deleteSubscriptionPlan(@Param('plan_id') plan_id: string) {
    return this.subscriptionService.deleteSubscriptionPlan(plan_id);
  }
}
