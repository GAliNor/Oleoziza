import { defineStore } from 'pinia';

import ReceptionService from 'reception/services/reception';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useClientStore } from 'client/stores/client';
import { logDevError, withStatus } from 'global/composables/with-status';
import type { ILot } from 'lot/types/lot';
import type { IReceiveLotPayload, IReceptionStore } from 'reception/types/reception';

const receptionService = new ReceptionService();

export const useReceptionStore = defineStore('reception', {
  state: (): IReceptionStore => ({
    settings: null,
    loadedSiteId: null,
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    operatorName: (): string => useSessionStore().session?.firstName ?? '',
  },
  actions: {
    async fetchSite(siteId: string, isForced = false): Promise<void> {
      if (!isForced && this.loadedSiteId === siteId && !this.hasError) return;
      const loaded = await withStatus(
        this,
        'isLoading',
        () => Promise.all([receptionService.getSettings(siteId), useLotStore().loadLots(siteId), useClientStore().fetchClients()]),
        { errorFlag: 'hasError' },
      );
      if (!loaded) return;
      [this.settings] = loaded;
      this.loadedSiteId = siteId;
    },
    /** Reads a new rate or limit when online; offline, the phone keeps the ones it last knew. */
    async refreshSettings(siteId: string): Promise<void> {
      try {
        this.settings = await receptionService.getSettings(siteId);
      } catch (error) {
        logDevError(error);
      }
    },
    /** Saves one Reception as a waiting Lot. The payload keeps its id, so a retry after a lost response never repeats it. */
    async receiveLot(payload: Omit<IReceiveLotPayload, 'receivedBy'>): Promise<ILot | null> {
      return withStatus(this, 'isSaving', async () => {
        const lot = await receptionService.receiveLot({
          ...payload,
          boxNumbers: [...payload.boxNumbers],
          receivedBy: this.operatorName,
        });
        useLotStore().upsertLot(lot);
        if (lot.creditDh) await useClientStore().fetchClients(true);
        return lot;
      });
    },
  },
});
