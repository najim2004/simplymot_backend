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

@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('plan')
  createSubscriptionPlan(
    @Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptionService.createSubscriptionPlan(
      createSubscriptionPlanDto,
    );
  }

  @Get('plan')
  getAllSubscriptionPlans(@Query() query: QuerySubscriptionPlanDto) {
    return this.subscriptionService.getAllSubscriptionPlans(query);
  }

  @Post('plan/:id/stripe/sync')
  syncStripeSubscriptionPlans(@Param('id') id: string) {
    return this.subscriptionService.syncStripeSubscriptionPlans(id);
  }

  @Get('plan/:id')
  getOneSubscriptionPlan(@Param('id') id: string) {
    return this.subscriptionService.getOneSubscriptionPlan(id);
  }

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

  @Delete('plan/:id')
  deleteSubscriptionPlan(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscriptionPlan(id);
  }
}
