import { defineStore } from 'pinia';

import ReceptionService from 'reception/services/reception';
import { useAuthStore } from 'auth/stores/auth';
import { useSyncStore } from 'global/stores/sync';
import { useClientStore } from 'global/stores/client';
import { draftNetKg } from 'reception/composables/weighing';
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
    operatorName: (): string => useAuthStore().session?.firstName ?? '',
  },
  actions: {
    async fetchSite(siteId: string, isForced = false): Promise<void> {
      if (!isForced && this.loadedSiteId === siteId && !this.hasError) return;
      this.isLoading = true;
      this.hasError = false;
      try {
        const [lots, settings] = await Promise.all([
          receptionService.getLots(siteId),
          receptionService.getSettings(siteId),
          useClientStore().fetchClients(),
        ]);
        this.lots = lots;
        this.settings = settings;
        this.reportPending();
        this.loadedSiteId = siteId;
      } catch (error) {
        this.hasError = true;
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },
    async openReception(payload: Omit<IOpenReceptionPayload, 'id' | 'receivedBy'>): Promise<ILot | null> {
      return this.save(async () => {
        const lot = await receptionService.openReception({
          ...payload,
          quality: [...payload.quality],
          id: crypto.randomUUID(),
          receivedBy: this.operatorName,
        });
        this.upsertLot(lot);
        return lot;
      });
    },
    async addWeighing(lot: ILot, draft: IWeighingDraft): Promise<ILot | null> {
      return this.save(async () => {
        const updated = await receptionService.addWeighing(lot.id, {
          id: crypto.randomUUID(),
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
      return this.save(async () => {
        const updated = await receptionService.finishReception(lot.id);
        this.upsertLot(updated);
        return updated;
      });
    },
    async readScale(siteId: string): Promise<number | null> {
      try {
        return await receptionService.readScale(siteId);
      } catch (error) {
        console.error(error);
        return null;
      }
    },
    async save<T>(request: () => Promise<T>): Promise<T | null> {
      this.isSaving = true;
      try {
        return await request();
      } catch (error) {
        console.error(error);
        return null;
      } finally {
        this.isSaving = false;
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
