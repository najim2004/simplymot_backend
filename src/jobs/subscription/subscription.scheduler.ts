import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import appConfig from 'src/config/app.config';
import { SUB_JOB_SYNC, SUB_QUEUE, SUB_SCHEDULER_ID } from './constants';

/** Registers the nightly BullMQ scheduler (Redis). */
@Injectable()
export class SubscriptionScheduler implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(@InjectQueue(SUB_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    const cfg = appConfig().jobs.subscriptionReconciliation;

    try {
      if (!cfg.enabled) {
        await this.queue
          .removeJobScheduler(SUB_SCHEDULER_ID)
          .catch(() => undefined);
        this.logger.log('Subscription sync scheduler: off');
        return;
      }

      await this.queue.upsertJobScheduler(
        SUB_SCHEDULER_ID,
        {
          pattern: cfg.cronPattern,
          tz: cfg.timezone,
        },
        {
          name: SUB_JOB_SYNC,
          data: {},
          opts: {
            removeOnComplete: true,
            removeOnFail: 50,
          },
        },
      );

      this.logger.log(
        `Subscription sync scheduler: ${cfg.cronPattern} (${cfg.timezone})`,
      );
    } catch (e) {
      this.logger.error('Subscription scheduler registration failed', e);
    }
  }
}
