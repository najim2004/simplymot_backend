import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PromoCodeService } from 'src/modules/promo-code/promo-code.service';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PromoCodeService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
