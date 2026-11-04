import { defineStore } from 'pinia';

import LotService from 'lot/services/lot';
import { useSyncStore } from 'global/stores/sync';
import type { ILot, ILotStore } from 'lot/types/lot';

const lotService = new LotService();

/** The Lots of the current Site, read across modules; reception opens and weighs them. */
export const useLotStore = defineStore('lot', {
  state: (): ILotStore => ({
    lots: [],
  }),
  getters: {
    receivedLots: (state): ILot[] => state.lots.filter((lot) => lot.status === 'received'),
    lotByCode: (state) => (code: string): ILot | undefined => state.lots.find((lot) => lot.code === code),
  },
  actions: {
    async loadLots(siteId: string): Promise<void> {
      this.lots = await lotService.getLots(siteId);
      this.reportPending();
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
