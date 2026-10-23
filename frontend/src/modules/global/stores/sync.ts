import { defineStore } from 'pinia';

import type { ISyncStore } from 'global/types/sync';

export const useSyncStore = defineStore('sync', {
  state: (): ISyncStore => ({
    pendingBySource: {},
  }),
  getters: {
    pendingCount: (state): number => Object.values(state.pendingBySource).reduce((total, count) => total + count, 0),
  },
  actions: {
    setPending(source: string, count: number): void {
      this.pendingBySource[source] = count;
    },
  },
});
