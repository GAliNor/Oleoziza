import { defineStore } from 'pinia';

import ReceptionService from 'reception/services/reception';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useClientStore } from 'client/stores/client';
import { draftNetKg } from 'reception/composables/weighing';
import { logDevError, withStatus } from 'global/composables/with-status';
import type { ILot } from 'lot/types/lot';
import type { IOpenReceptionPayload, IReceptionStore, IWeighingDraft } from 'reception/types/reception';

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
    async openReception(payload: Omit<IOpenReceptionPayload, 'receivedBy'>): Promise<ILot | null> {
      return withStatus(this, 'isSaving', async () => {
        const lot = await receptionService.openReception({
          ...payload,
          boxNumbers: [...payload.boxNumbers],
          receivedBy: this.operatorName,
        });
        useLotStore().upsertLot(lot);
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
        useLotStore().upsertLot(updated);
        return updated;
      });
    },
    async finishReception(lot: ILot): Promise<ILot | null> {
      return withStatus(this, 'isSaving', async () => {
        const updated = await receptionService.finishReception(lot.id);
        useLotStore().upsertLot(updated);
        return updated;
      });
    },
    /** Opens, weighs and finishes one Reception. Each step keeps its own id, so a retry after a lost response never repeats one. */
    async receiveLot(payload: Omit<IOpenReceptionPayload, 'receivedBy'>, weighing: IWeighingDraft): Promise<ILot | null> {
      const opened = await this.openReception(payload);
      if (!opened) return null;
      if (opened.status !== 'received') return opened;
      const weighed = await this.addWeighing(opened, weighing);
      return weighed && this.finishReception(weighed);
    },
    async readScale(siteId: string): Promise<number | null> {
      try {
        return await receptionService.readScale(siteId);
      } catch (error) {
        logDevError(error);
        return null;
      }
    },
  },
});
