import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SubscriptionSyncService } from '../subscription-sync.service';
import { SUB_JOB_SYNC, SUB_QUEUE } from '../constants';

@Processor(SUB_QUEUE, { concurrency: 1 })
export class SubscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionProcessor.name);

  constructor(private readonly subscriptionSync: SubscriptionSyncService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== SUB_JOB_SYNC) {
      this.logger.warn(`Unknown job: ${job.name}`);
      return;
    }
    await this.subscriptionSync.syncAllFromStripe();
  }
}
