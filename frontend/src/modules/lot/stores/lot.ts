import { defineStore } from 'pinia';

import LotService from 'lot/services/lot';
import { useSessionStore } from 'global/stores/session';
import { useSyncStore } from 'global/stores/sync';
import { withStatus } from 'global/composables/with-status';
import type { IDiscountDecision, IDiscountGift, ILot, ILotMove, ILotSchedule, ILotStore } from 'lot/types/lot';

const lotService = new LotService();

/** The Lots of the current Site, read across modules; reception creates them. */
export const useLotStore = defineStore('lot', {
  state: (): ILotStore => ({
    lots: [],
    loadedSiteId: null,
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    pendingDiscountLots: (state): ILot[] => state.lots.filter((lot) => lot.discount?.state === 'pending'),
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
    /** Reads the loaded Site's Lots again after a Payment changed what they owe; a failure keeps what is shown. */
    async reloadLoaded(): Promise<void> {
      if (this.loadedSiteId) await withStatus(this, 'isSaving', () => this.loadLots(this.loadedSiteId as string));
    },
    async moveLot(lot: ILot, move: ILotMove): Promise<ILot | null> {
      const updated = await withStatus(this, 'isSaving', () => lotService.moveLot(lot.id, { ...move, by: useSessionStore().fullName }));
      if (updated) this.upsertLot(updated);
      return updated;
    },
    /** The limit binds everyone but the Owner, and nobody but the Owner decides their own Discount. */
    async decideDiscount(lot: ILot, decision: IDiscountDecision): Promise<ILot | null> {
      const sessionStore = useSessionStore();
      if (!lot.discount || !sessionStore.canValidate(lot.discount.givenBy)) return null;
      const updated = await withStatus(this, 'isSaving', () => lotService.decideDiscount(lot.id, { ...decision, by: sessionStore.fullName }));
      if (updated) this.upsertLot(updated);
      return updated;
    },
    async giveDiscount(lot: ILot, gift: IDiscountGift): Promise<ILot | null> {
      const updated = await withStatus(this, 'isSaving', () => lotService.giveDiscount(lot.id, { ...gift, by: useSessionStore().fullName }));
      if (updated) this.upsertLot(updated);
      return updated;
    },
    async scheduleLot(lot: ILot, schedule: ILotSchedule): Promise<ILot | null> {
      const updated = await withStatus(this, 'isSaving', () => lotService.scheduleLot(lot.id, { ...schedule }));
      if (updated) this.upsertLot(updated);
      return updated;
    },
    async clearMissingContact(lot: ILot): Promise<void> {
      const updated = await withStatus(this, 'isSaving', () => lotService.clearMissingContact(lot.id));
      if (updated) this.upsertLot(updated);
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
