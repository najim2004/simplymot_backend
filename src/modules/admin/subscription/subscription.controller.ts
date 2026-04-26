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
import {
  CreateSubscriptionDto,
  CreateSubscriptionPlanDto,
} from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { QuerySubscriptionPlanDto } from './dto/query-subscription.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @ApiSuccessResponse({
    summary: 'Create subscription plan',
    message: 'Subscription plan created successfully',
    status: HttpStatus.CREATED,
    data: { id: 'plan_id' },
    includeAuthErrors: true,
  })
  @Post('plan')
  createSubscriptionPlan(
    @Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptionService.createSubscriptionPlan(
      createSubscriptionPlanDto,
    );
  }

  @ApiSuccessResponse({
    summary: 'List subscription plans',
    message: 'Subscription plans fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get('plan')
  getAllSubscriptionPlans(@Query() query: QuerySubscriptionPlanDto) {
    return this.subscriptionService.getAllSubscriptionPlans(query);
  }

  @ApiSuccessResponse({
    summary: 'Sync subscription plan with Stripe',
    message: 'Subscription plan synced with Stripe successfully',
    data: { id: 'plan_id', stripe_price_id: 'price_xxx' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post('plan/:id/stripe/sync')
  syncStripeSubscriptionPlans(@Param('id') id: string) {
    return this.subscriptionService.syncStripeSubscriptionPlans(id);
  }

  @ApiSuccessResponse({
    summary: 'Get subscription plan',
    message: 'Subscription plan fetched successfully',
    data: { id: 'plan_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get('plan/:id')
  getOneSubscriptionPlan(@Param('id') id: string) {
    return this.subscriptionService.getOneSubscriptionPlan(id);
  }

  @ApiSuccessResponse({
    summary: 'Update subscription plan',
    message: 'Subscription plan updated successfully',
    data: { id: 'plan_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch('plan/:id')
  updateSubscriptionPlan(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.updateSubscriptionPlan(
      id,
      updateSubscriptionDto,
    );
  }

  @ApiSuccessResponse({
    summary: 'Delete subscription plan',
    message: 'Subscription plan deleted successfully',
    data: { id: 'plan_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete('plan/:id')
  deleteSubscriptionPlan(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscriptionPlan(id);
  }
}
