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

@ApiTags('Subscription')
@ApiBearerAuth()
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getAvailablePlans(@Query() query: QueryAvailableSubscriptionPlansDto) {
    return this.subscriptionService.getAvailablePlans(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentSubscription(@User('id') user_id: string) {
    return this.subscriptionService.getCurrentSubscription(user_id);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckoutSession(
    @User('id') user_id: string,
    @Body() checkoutDto: SubscriptionCheckoutDto,
  ) {
    return this.subscriptionService.createCheckoutSession(user_id, checkoutDto);
  }

  @Post('billing-portal')
  @UseGuards(JwtAuthGuard)
  createBillingPortalSession(@User('id') user_id: string) {
    return this.subscriptionService.createBillingPortalSession(user_id);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancelSubscription(
    @User('id') user_id: string,
    @Body() cancelDto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(user_id, cancelDto);
  }

  @Get('success')
  validateCheckoutSession(@Query('session_id') session_id: string) {
    return this.subscriptionService.validateCheckoutSession(session_id);
  }
}
