import { defineStore } from 'pinia';

import type { IOutboxEntry } from 'global/types/outbox';
import type { ISyncStore } from 'global/types/sync';

const STALE_AFTER_MS = 24 * 60 * 60_000;

/** What waits to reach the server: the outbox's entries, and the counts of stores not on it yet. */
export const useSyncStore = defineStore('sync', {
  state: (): ISyncStore => ({
    pendingBySource: {},
    outboxEntries: [],
  }),
  getters: {
    pendingCount: (state): number => state.outboxEntries.length + Object.values(state.pendingBySource).reduce((total, count) => total + count, 0),
    failedEntries: (state): IOutboxEntry[] => state.outboxEntries.filter((entry) => entry.status === 'failed'),
    /** An entry pending for more than a day: the Operator should open the app online before the phone drops it. */
    hasStaleEntries: (state): boolean => state.outboxEntries.some((entry) => Date.now() - entry.createdAt > STALE_AFTER_MS),
    isPending:
      (state) =>
      (recordId: string): boolean =>
        state.outboxEntries.some((entry) => entry.recordId === recordId),
  },
  actions: {
    setPending(source: string, count: number): void {
      this.pendingBySource[source] = count;
    },
    setOutboxEntries(entries: IOutboxEntry[]): void {
      this.outboxEntries = entries;
    },
  },
});
