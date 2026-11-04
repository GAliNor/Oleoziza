import { defineStore } from 'pinia';

import LotService from 'lot/services/lot';
import { useSyncStore } from 'global/stores/sync';
import { withStatus } from 'global/composables/with-status';
import type { ILot, ILotMove, ILotStore } from 'lot/types/lot';

const lotService = new LotService();

/** The Lots of the current Site, read across modules; reception opens and weighs them. */
export const useLotStore = defineStore('lot', {
  state: (): ILotStore => ({
    lots: [],
    loadedSiteId: null,
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    receivedLots: (state): ILot[] => state.lots.filter((lot) => lot.status === 'received'),
    lotByCode: (state) => (code: string): ILot | undefined => state.lots.find((lot) => lot.code === code),
  },
  actions: {
    async fetchLots(siteId: string, isForced = false): Promise<void> {
      if (!isForced && this.loadedSiteId === siteId && !this.hasError) return;
      await withStatus(this, 'isLoading', () => this.loadLots(siteId), { errorFlag: 'hasError' });
    },
    /** Loads without status flags and lets a failure through, for a caller that loads more alongside. */
    async loadLots(siteId: string): Promise<void> {
      this.lots = await lotService.getLots(siteId);
      this.loadedSiteId = siteId;
      this.reportPending();
    },
    async moveLot(lot: ILot, move: ILotMove): Promise<ILot | null> {
      const updated = await withStatus(this, 'isSaving', () => lotService.moveLot(lot.id, move));
      if (updated) this.upsertLot(updated);
      return updated;
    },
    upsertLot(lot: ILot): void {
      const index = this.lots.findIndex((item) => item.id === lot.id);
      if (index === -1) this.lots.unshift(lot);
      else this.lots.splice(index, 1, lot);
      this.reportPending();
    },
    reportPending(): void {
      useSyncStore().setPending('lots', this.lots.filter((lot) => lot.isPendingSync).length);
    },
  },
});
