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
import { UpdateSubscriptionPlanDto } from './dto/update-subscription.dto';
import { QuerySubscriptionPlanDto } from './dto/query-subscription.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  CreateSubscriptionPlanResponseDto,
  DeleteSubscriptionPlanResponseDto,
  GetSubscriptionPlanResponseDto,
  ListSubscriptionPlansResponseDto,
  SyncStripePlanResponseDto,
  UpdateSubscriptionPlanResponseDto,
} from './dto/swagger/subscription-api.dto';

@ApiTags('Admin Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @apiTypedDoc(
    {
      summary: 'Create subscription plan',
      description: 'ADMIN + JWT.',
    },
    { type: CreateSubscriptionPlanResponseDto, status: HttpStatus.CREATED },
  )
  @Post('plan')
  createSubscriptionPlan(
    @Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptionService.createSubscriptionPlan(
      createSubscriptionPlanDto,
    );
  }

  @apiTypedDoc(
    {
      summary: 'List subscription plans',
      description: 'ADMIN + JWT.',
    },
    { type: ListSubscriptionPlansResponseDto },
  )
  @Get('plan')
  getAllSubscriptionPlans(@Query() query: QuerySubscriptionPlanDto) {
    return this.subscriptionService.getAllSubscriptionPlans(query);
  }

  @apiTypedDoc(
    {
      summary: 'Sync plan with Stripe',
      description: 'ADMIN + JWT.',
    },
    { type: SyncStripePlanResponseDto },
  )
  @Post('plan/:plan_id/stripe/sync')
  syncStripeSubscriptionPlans(@Param('plan_id') plan_id: string) {
    return this.subscriptionService.syncStripeSubscriptionPlans(plan_id);
  }

  @apiTypedDoc(
    {
      summary: 'Get subscription plan',
      description: 'ADMIN + JWT.',
    },
    { type: GetSubscriptionPlanResponseDto },
  )
  @Get('plan/:plan_id')
  getOneSubscriptionPlan(@Param('plan_id') plan_id: string) {
    return this.subscriptionService.getOneSubscriptionPlan(plan_id);
  }

  @apiTypedDoc(
    {
      summary: 'Update subscription plan',
      description: 'ADMIN + JWT.',
    },
    { type: UpdateSubscriptionPlanResponseDto },
  )
  @Patch('plan/:plan_id')
  updateSubscriptionPlan(
    @Param('plan_id') plan_id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionService.updateSubscriptionPlan(
      plan_id,
      updateSubscriptionPlanDto,
    );
  }

  @apiTypedDoc(
    {
      summary: 'Delete subscription plan',
      description: 'ADMIN + JWT.',
    },
    { type: DeleteSubscriptionPlanResponseDto },
  )
  @Delete('plan/:plan_id')
  deleteSubscriptionPlan(@Param('plan_id') plan_id: string) {
    return this.subscriptionService.deleteSubscriptionPlan(plan_id);
  }
}
