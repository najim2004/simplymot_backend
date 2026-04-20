import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { SubscriptionStatus } from 'prisma/generated/enums';
import type { Prisma } from 'prisma/generated/client';
import type Stripe from 'stripe';
import appConfig from 'src/config/app.config';

type SyncSummary = {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
};

type SubRow = {
  id: string;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  next_billing_date: Date | null;
  cancel_at_period_end: boolean | null;
  cancel_at: Date | null;
};

/** Stripe ↔ DB reconciliation (webhook safety net). */
@Injectable()
export class SubscriptionSyncService {
  private readonly logger = new Logger(SubscriptionSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncAllFromStripe(): Promise<SyncSummary> {
    const { batchSize, stripeConcurrency } =
      appConfig().jobs.subscriptionReconciliation;

    const summary: SyncSummary = {
      scanned: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    let cursor: string | undefined;

    for (;;) {
      const batch = await this.prisma.subscription.findMany({
        where: { stripe_subscription_id: { not: null } },
        select: {
          id: true,
          status: true,
          stripe_subscription_id: true,
          current_period_start: true,
          current_period_end: true,
          next_billing_date: true,
          cancel_at_period_end: true,
          cancel_at: true,
        },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (!batch.length) break;

      summary.scanned += batch.length;

      for (let i = 0; i < batch.length; i += stripeConcurrency) {
        const slice = batch.slice(i, i + stripeConcurrency) as SubRow[];
        const results = await Promise.allSettled(
          slice.map((row) => this.syncOne(row)),
        );

        for (const r of results) {
          if (r.status === 'fulfilled') {
            if (r.value === 'updated') summary.updated += 1;
            else summary.skipped += 1;
          } else {
            summary.failed += 1;
            this.logger.warn(
              `Sync failed: ${r.reason instanceof Error ? r.reason.message : r.reason}`,
            );
          }
        }
      }

      cursor = batch[batch.length - 1]!.id;
      if (batch.length < batchSize) break;
    }

    this.logger.log(
      `Subscription Stripe sync: scanned=${summary.scanned} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`,
    );

    return summary;
  }

  private mapStripeStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (stripeStatus) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete':
        return SubscriptionStatus.INACTIVE;
      case 'incomplete_expired':
        return SubscriptionStatus.CANCELLED;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }

  private sameInstant(a: Date | null, b: Date | null) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return Math.abs(a.getTime() - b.getTime()) < 2000;
  }

  private needsWrite(row: SubRow, patch: Prisma.SubscriptionUpdateInput) {
    if (row.status !== patch.status) return true;
    if (row.cancel_at_period_end !== patch.cancel_at_period_end) return true;
    if (!this.sameInstant(row.cancel_at, patch.cancel_at as Date | null))
      return true;
    if (
      !this.sameInstant(
        row.current_period_start,
        patch.current_period_start as Date | null,
      )
    )
      return true;
    if (
      !this.sameInstant(
        row.current_period_end,
        patch.current_period_end as Date | null,
      )
    )
      return true;
    if (
      !this.sameInstant(
        row.next_billing_date,
        patch.next_billing_date as Date | null,
      )
    )
      return true;
    return false;
  }

  private async syncOne(row: SubRow): Promise<'updated' | 'skipped'> {
    const stripeId = row.stripe_subscription_id;
    if (!stripeId) return 'skipped';

    let stripeSub: Stripe.Subscription;
    try {
      stripeSub = (await StripePayment.retrieveSubscription(
        stripeId,
      )) as Stripe.Subscription;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('No such subscription') ||
        msg.includes('resource_missing')
      ) {
        if (row.status === SubscriptionStatus.CANCELLED) {
          return 'skipped';
        }
        await this.prisma.subscription.update({
          where: { id: row.id },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancel_at: row.cancel_at ?? new Date(),
          },
        });
        return 'updated';
      }
      throw err instanceof Error ? err : new Error(msg);
    }

    const mapped = this.mapStripeStatus(stripeSub.status);
    // Stripe API (newer SDK): billing period is on the primary SubscriptionItem, not the Subscription root.
    const primaryItem = stripeSub.items?.data?.[0] as
      | Stripe.SubscriptionItem
      | undefined;
    const periodStartSec = primaryItem?.current_period_start;
    const periodEndSec = primaryItem?.current_period_end;

    const patch: Prisma.SubscriptionUpdateInput = {
      status: mapped,
      cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
      cancel_at: stripeSub.cancel_at
        ? new Date(stripeSub.cancel_at * 1000)
        : null,
    };

    if (periodStartSec && periodEndSec) {
      patch.current_period_start = new Date(periodStartSec * 1000);
      patch.current_period_end = new Date(periodEndSec * 1000);
      patch.next_billing_date = new Date(periodEndSec * 1000);
    }

    if (!this.needsWrite(row, patch)) return 'skipped';

    await this.prisma.subscription.update({
      where: { id: row.id },
      data: patch,
    });

    return 'updated';
  }
}
