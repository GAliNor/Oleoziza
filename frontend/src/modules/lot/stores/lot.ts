import { defineStore } from 'pinia';

import { i18n } from '~/plugins/i18n';

import LotService from 'lot/services/lot';
import { useSessionStore } from 'global/stores/session';
import { useSyncStore } from 'global/stores/sync';
import { withStatus } from 'global/composables/with-status';
import { cachedLoad, invalidateLoads, LOAD_TTL_MS, markSlot, slotLoad } from 'global/composables/cached-load';
import { emptyPagedList, loadFirstPage, loadNextPage } from 'global/composables/paged-list';
import { outbox } from 'global/services/app-outbox';
import { isRetryable } from 'global/services/outbox';
import { ALL_SITES } from 'site/constants/site';
import { advanceLocally } from 'lot/composables/pending-move';
import type { IDiscountDecision, IDiscountGift, ILot, ILotMove, ILotMovePayload, ILotSchedule, ILotStore, IRateCorrection, IWithoutLineQuery } from 'lot/types/lot';

const lotService = new LotService();

export const LOT_MOVE_WRITE = 'lot.move';

outbox.register(LOT_MOVE_WRITE, async (payload) => {
  const { lotId, move } = payload as { lotId: string; move: ILotMovePayload };
  useLotStore().upsertLot({ ...(await lotService.moveLot(lotId, move)), isPendingSync: false });
});

/** The Lots of the current Site, read across modules; reception creates them. */
export const useLotStore = defineStore('lot', {
  state: (): ILotStore => ({
    lots: [],
    withoutLine: emptyPagedList<ILot, IWithoutLineQuery>(),
    photosByLot: {},
    loadedSiteId: null,
    isLoading: false,
    isSaving: false,
    isLoadingPhotos: false,
    hasError: false,
  }),
  getters: {
    pendingDiscountLots: (state): ILot[] => state.lots.filter((lot) => lot.discount?.state === 'pending'),
    lotByCode: (state) => (code: string): ILot | undefined => state.lots.find((lot) => lot.code === code),
  },
  actions: {
    async fetchLots(siteId: string, isForced = false): Promise<void> {
      await withStatus(this, 'isLoading', () => slotLoad('lots', siteId, LOAD_TTL_MS.live, () => lotService.getLots(siteId), (lots) => this.keepLots(siteId, lots), isForced), { errorFlag: 'hasError' });
    },
    /** Loads without status flags and lets a failure through, for a caller that loads more alongside. */
    async loadLots(siteId: string): Promise<void> {
      this.keepLots(siteId, await lotService.getLots(siteId));
      markSlot('lots', siteId);
    },
    /** Replaces the Lots shown by a Site's, keeping that Site's own still waiting to be sent. */
    keepLots(siteId: string, lots: ILot[]): void {
      const knownIds = new Set(lots.map((lot) => lot.id));
      this.lots = [...this.lots.filter((lot) => lot.siteId === siteId && lot.isPendingSync && !knownIds.has(lot.id)), ...lots];
      this.loadedSiteId = siteId;
      this.reportPending();
    },
    /** The Lots waiting for a Press Line, ten at a time from the server. */
    fetchWithoutLine(siteId: string, isForced = false): Promise<void> {
      return loadFirstPage(this.withoutLine, { siteId }, (query, page) => lotService.getWithoutLine(query.siteId, page), isForced);
    },
    fetchMoreWithoutLine(): Promise<void> {
      return loadNextPage(this.withoutLine, (query, page) => lotService.getWithoutLine(query.siteId, page));
    },
    /** Keeps that list in step with a Lot just received, given a Line or pressed, without asking the server again. */
    trackWithoutLine(lot: ILot): void {
      const list = this.withoutLine;
      if (!list.query || lot.isPendingSync || (list.query.siteId !== ALL_SITES && list.query.siteId !== lot.siteId)) return;
      const index = list.items.findIndex((item) => item.id === lot.id);
      const belongs = lot.status === 'waiting' && !lot.pressLineId;
      if (index !== -1 && belongs) list.items.splice(index, 1, lot);
      if (index !== -1 && !belongs) {
        list.items.splice(index, 1);
        list.total -= 1;
      }
      if (index === -1 && belongs) {
        if (list.items.length >= list.total) list.items.push(lot);
        list.total += 1;
      }
    },
    /** A Lot's stored photos, read when its timeline opens; what was taken on this device shows at once. */
    async fetchPhotos(lot: ILot): Promise<void> {
      if (!lot.photoSteps?.length) return;
      await withStatus(this, 'isLoadingPhotos', () =>
        cachedLoad(`lot-photos:${lot.id}:${lot.photoSteps?.join()}`, LOAD_TTL_MS.records, async () => {
          this.photosByLot[lot.id] = await lotService.getPhotos(lot.id);
        }),
      );
    },
    /** Reads the loaded Site's Lots again after a Payment changed what they owe; a failure keeps what is shown. */
    async reloadLoaded(): Promise<void> {
      if (this.loadedSiteId) await withStatus(this, 'isSaving', () => this.loadLots(this.loadedSiteId as string));
    },
    /** Online first; when the network is gone the Lot moves on the phone, marked pending, and the outbox sends the step later. */
    async moveLot(lot: ILot, move: ILotMove): Promise<ILot | null> {
      const payload: ILotMovePayload = { ...move, by: useSessionStore().fullName };
      let isOffline = false;
      const updated = await withStatus(this, 'isSaving', async () => {
        try {
          return await lotService.moveLot(lot.id, payload);
        } catch (error) {
          if (!isRetryable(error)) throw error;
          isOffline = true;
          return null;
        }
      });
      if (isOffline) {
        const pending = advanceLocally(lot, payload);
        this.upsertLot(pending);
        await outbox.enqueue(LOT_MOVE_WRITE, move.id, lot.id, { lotId: lot.id, move: payload });
        return pending;
      }
      if (updated) this.upsertLot(updated);
      return updated;
    },
    /** The limit binds everyone but the Owner, and nobody but the Owner decides their own Discount. */
    async decideDiscount(lot: ILot, decision: IDiscountDecision): Promise<ILot | null> {
      const sessionStore = useSessionStore();
      if (!lot.discount || !sessionStore.canValidate(lot.discount.givenBy)) return null;
      const updated = await withStatus(this, 'isSaving', () => lotService.decideDiscount(lot.id, { ...decision, by: sessionStore.fullName }));
      if (updated) this.upsertLot(updated);
      invalidateLoads('tasks:');
      return updated;
    },
    async giveDiscount(lot: ILot, gift: IDiscountGift): Promise<ILot | null> {
      const updated = await withStatus(this, 'isSaving', () => lotService.giveDiscount(lot.id, { ...gift, by: useSessionStore().fullName }));
      if (updated) this.upsertLot(updated);
      return updated;
    },
    async correctRate(lot: ILot, correction: IRateCorrection): Promise<ILot | null> {
      const updated = await withStatus(this, 'isSaving', () => lotService.correctRate(lot.id, { ...correction, by: useSessionStore().fullName }));
      if (updated) this.upsertLot(updated);
      return updated;
    },
    async scheduleLot(lot: ILot, schedule: ILotSchedule): Promise<ILot | null> {
      const updated = await withStatus(this, 'isSaving', () => lotService.scheduleLot(lot.id, { ...schedule }), { errorMessage: i18n.global.t('lot.schedule.error') });
      if (updated) this.upsertLot(updated);
      return updated;
    },
    async clearMissingContact(lot: ILot): Promise<void> {
      const updated = await withStatus(this, 'isSaving', () => lotService.clearMissingContact(lot.id));
      if (updated) this.upsertLot(updated);
    },
    upsertLot(lot: ILot): void {
      this.trackWithoutLine(lot);
      const index = this.lots.findIndex((item) => item.id === lot.id);
      if (index === -1) this.lots.unshift(lot);
      else this.lots.splice(index, 1, lot);
      this.reportPending();
    },
    reportPending(): void {
      const syncStore = useSyncStore();
      syncStore.setPending('lots', this.lots.filter((lot) => lot.isPendingSync && !syncStore.isPending(lot.id)).length);
    },
  },
});
