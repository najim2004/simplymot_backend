import { Module } from '@nestjs/common';
import { SubscriptionQueueModule } from './subscription/subscription-queue.module';

/** Background jobs (BullMQ). Add `.<domain>/` modules here. */
@Module({
  imports: [SubscriptionQueueModule],
})
export class JobsModule {}
