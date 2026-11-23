import { defineStore } from 'pinia';

import ReceptionService from 'reception/services/reception';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useClientStore } from 'client/stores/client';
import { useConfigurationStore } from 'configuration/stores/configuration';
import { invalidateLoads } from 'global/composables/cached-load';
import { logDevError, withStatus } from 'global/composables/with-status';
import { outbox } from 'global/services/app-outbox';
import { buildPendingLot } from 'reception/composables/pending-lot';
import type { IConfiguration } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';
import type { IReceiveLotPayload, IReceptionStore, ISiteReceptionSettings } from 'reception/types/reception';

const receptionService = new ReceptionService();

export const RECEPTION_RECEIVE_WRITE = 'reception.receive';

outbox.register(RECEPTION_RECEIVE_WRITE, async (payload) => {
  const lot = await receptionService.receiveLot(payload as IReceiveLotPayload);
  useLotStore().upsertLot({ ...lot, isPendingSync: false });
  if (lot.creditDh) await useClientStore().fetchClients(true);
});

/** What the Reception form needs from the open Season's Configuration; the purchase price waits for Purchases. */
const toReceptionSettings = (configuration: IConfiguration): ISiteReceptionSettings => ({
  dailyPricePerKg: null,
  millingRatePerKg: configuration.millingRate,
  discountLimitPercent: configuration.discountLimit,
  boxCount: configuration.boxCount,
  boxCapacityKg: configuration.boxCapacityKg,
  pressLines: configuration.pressLines,
  tanks: configuration.tanks,
  isSeasonOpen: configuration.seasonStatus === 'open',
});

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
    /** The Site's Configuration (shared, usually cached), its Lots and the Clients, together. */
    async fetchSite(siteId: string, isForced = false): Promise<void> {
      if (!isForced && this.loadedSiteId === siteId && !this.hasError) return;
      const configurationStore = useConfigurationStore();
      const loaded = await withStatus(
        this,
        'isLoading',
        () => Promise.all([configurationStore.fetchSites([siteId]), useLotStore().loadLots(siteId), useClientStore().fetchClients()]),
        { errorFlag: 'hasError' },
      );
      const configuration = configurationStore.bySite[siteId];
      if (!loaded || !configuration) return;
      this.settings = toReceptionSettings(configuration);
      this.loadedSiteId = siteId;
    },
    /** Reads a new rate or limit when online; offline, the phone keeps the ones it last knew. */
    async refreshSettings(siteId: string): Promise<void> {
      try {
        invalidateLoads(`configuration:${siteId}:`);
        const configurationStore = useConfigurationStore();
        await configurationStore.fetchSites([siteId]);
        const configuration = configurationStore.bySite[siteId];
        if (configuration) this.settings = toReceptionSettings(configuration);
      } catch (error) {
        logDevError(error);
      }
    },
    /** Works offline: the Lot shows at once, waiting and pending, and the outbox sends it; the server's Lot (with its code) replaces it. */
    async receiveLot(payload: Omit<IReceiveLotPayload, 'receivedBy'>): Promise<ILot> {
      const full: IReceiveLotPayload = { ...payload, boxNumbers: [...payload.boxNumbers], receivedBy: this.operatorName };
      const pending = buildPendingLot(full, useClientStore().clientById(payload.clientId)?.name ?? '');
      useLotStore().upsertLot(pending);
      await outbox.enqueue(RECEPTION_RECEIVE_WRITE, payload.id, payload.id, full);
      return pending;
    },
  },
});
