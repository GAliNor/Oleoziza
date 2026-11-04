import { defineStore } from 'pinia';

import ReceptionService from 'reception/services/reception';
import { useSessionStore } from 'global/stores/session';
import { useSyncStore } from 'global/stores/sync';
import { useClientStore } from 'global/stores/client';
import { draftNetKg } from 'reception/composables/weighing';
import { logDevError, withStatus } from 'global/composables/with-status';
import type { ILot, IOpenReceptionPayload, IReceptionStore, IWeighingDraft } from 'reception/types/reception';

const receptionService = new ReceptionService();

export const useReceptionStore = defineStore('reception', {
  state: (): IReceptionStore => ({
    lots: [],
    settings: null,
    loadedSiteId: null,
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    receivedLots: (state): ILot[] => state.lots.filter((lot) => lot.status === 'received'),
    lotByCode: (state) => (code: string): ILot | undefined => state.lots.find((lot) => lot.code === code),
    operatorName: (): string => useSessionStore().session?.firstName ?? '',
  },
  actions: {
    async fetchSite(siteId: string, isForced = false): Promise<void> {
      if (!isForced && this.loadedSiteId === siteId && !this.hasError) return;
      const loaded = await withStatus(
        this,
        'isLoading',
        () => Promise.all([receptionService.getLots(siteId), receptionService.getSettings(siteId), useClientStore().fetchClients()]),
        { errorFlag: 'hasError' },
      );
      if (!loaded) return;
      [this.lots, this.settings] = loaded;
      this.reportPending();
      this.loadedSiteId = siteId;
    },
    async openReception(payload: Omit<IOpenReceptionPayload, 'receivedBy'>): Promise<ILot | null> {
      return withStatus(this, 'isSaving', async () => {
        const lot = await receptionService.openReception({
          ...payload,
          quality: [...payload.quality],
          receivedBy: this.operatorName,
        });
        this.upsertLot(lot);
        return lot;
      });
    },
    async addWeighing(lot: ILot, draft: IWeighingDraft): Promise<ILot | null> {
      return withStatus(this, 'isSaving', async () => {
        const updated = await receptionService.addWeighing(lot.id, {
          id: draft.id,
          kind: draft.kind,
          grossKg: draft.kind === 'gross' ? draft.grossKg : null,
          containers: { ...draft.containers },
          netKg: draftNetKg(draft, this.settings),
          source: draft.source,
          recordedBy: this.operatorName,
        });
        this.upsertLot(updated);
        return updated;
      });
    },
    async finishReception(lot: ILot): Promise<ILot | null> {
      return withStatus(this, 'isSaving', async () => {
        const updated = await receptionService.finishReception(lot.id);
        this.upsertLot(updated);
        return updated;
      });
    },
    async readScale(siteId: string): Promise<number | null> {
      try {
        return await receptionService.readScale(siteId);
      } catch (error) {
        logDevError(error);
        return null;
      }
    },
    upsertLot(lot: ILot): void {
      const index = this.lots.findIndex((item) => item.id === lot.id);
      if (index === -1) this.lots.unshift(lot);
      else this.lots.splice(index, 1, lot);
      this.reportPending();
    },
    reportPending(): void {
      useSyncStore().setPending('reception', this.lots.filter((lot) => lot.isPendingSync).length);
    },
  },
});
