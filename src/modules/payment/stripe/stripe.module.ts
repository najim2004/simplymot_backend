import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { SubscriptionModule } from 'src/modules/application/subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [StripeController],
  providers: [StripeService],
})
export class StripeModule {}
