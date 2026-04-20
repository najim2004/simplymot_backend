import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SUB_QUEUE } from './constants';
import { SubscriptionSyncService } from './subscription-sync.service';
import { SubscriptionProcessor } from './processors/subscription.processor';
import { SubscriptionScheduler } from './subscription.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SUB_QUEUE,
    }),
  ],
  providers: [
    SubscriptionSyncService,
    SubscriptionProcessor,
    SubscriptionScheduler,
  ],
  exports: [SubscriptionSyncService],
})
export class SubscriptionQueueModule {}
