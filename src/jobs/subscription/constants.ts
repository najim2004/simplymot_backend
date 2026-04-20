/** Redis queue name (stable across deploys) */
export const SUB_QUEUE = 'subscription-jobs';

/** BullMQ job scheduler id — upsert/remove by this key */
export const SUB_SCHEDULER_ID = 'subscription-stripe-nightly-reconcile';

/** Job name emitted by the scheduler; handled in the processor */
export const SUB_JOB_SYNC = 'stripe-subscription-reconcile';
