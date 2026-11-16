import type { IOutboxEntry } from 'global/types/outbox';

export interface ISyncStore {
  /** Pending counts kept by stores whose writes are not on the outbox yet (`lots`). */
  pendingBySource: Record<string, number>;
  outboxEntries: IOutboxEntry[];
}
