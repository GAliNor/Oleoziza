import { defineStore } from 'pinia';

import FinanceService from 'finance/services/finance';
import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import type { IFinanceStore, ILotPaymentLink, IMovement, IMovementDecision, IPaymentDocument, IRecordPaymentPayload, IRefund } from 'finance/types/finance';
import type { PeriodKey } from 'global/types/period';

const financeService = new FinanceService();

/** Copies a list a form holds, so no reactive proxy leaves the store. */
const plainList = <T extends object>(items: readonly T[]): T[] => items.map((item) => ({ ...item }));

/** The Payments, Payouts and sales figures of the current Site. */
export const useFinanceStore = defineStore('finance', {
  state: (): IFinanceStore => ({
    movements: [],
    refunds: [],
    sales: null,
    salesQuery: null,
    loadedSiteId: null,
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  actions: {
    async fetchMovements(siteId: string, isForced = false): Promise<void> {
      if (!isForced && this.loadedSiteId === siteId && !this.hasError) return;
      const movements = await withStatus(this, 'isLoading', () => financeService.getMovements(siteId), { errorFlag: 'hasError' });
      if (!movements) return;
      this.movements = movements;
      this.loadedSiteId = siteId;
    },
    async fetchSales(siteId: string, period: PeriodKey): Promise<void> {
      this.salesQuery = { siteId, period };
      const sales = await withStatus(this, 'isLoading', () => financeService.getSales(siteId, period), { errorFlag: 'hasError' });
      if (sales) this.sales = sales;
    },
    async fetchRefunds(siteId: string): Promise<void> {
      const refunds = await withStatus(this, 'isLoading', () => financeService.getRefunds(siteId));
      if (refunds) this.refunds = refunds;
    },
    load(siteId: string, period: PeriodKey, isForced = false): Promise<void[]> {
      return Promise.all([this.fetchMovements(siteId, isForced), this.fetchSales(siteId, period), this.fetchRefunds(siteId)]);
    },
    /** Reads the figures again after a Payment moved money between them. */
    async refreshSales(): Promise<void> {
      if (this.salesQuery) await this.fetchSales(this.salesQuery.siteId, this.salesQuery.period);
    },
    replaceMovement(updated: IMovement): void {
      const index = this.movements.findIndex((item) => item.id === updated.id);
      if (index === -1) this.movements.unshift(updated);
      else this.movements.splice(index, 1, updated);
    },
    replaceRefund(updated: IRefund): void {
      this.refunds.splice(this.refunds.findIndex((item) => item.id === updated.id), 1, updated);
    },
    async linkLots(movement: IMovement, lotLinks: ILotPaymentLink[]): Promise<IMovement | null> {
      const updated = await withStatus(this, 'isSaving', () => financeService.linkLots(movement.id, plainList(lotLinks)));
      if (!updated) return null;
      this.replaceMovement(updated);
      await useLotStore().reloadLoaded();
      return updated;
    },
    async addDocuments(movement: IMovement, documents: IPaymentDocument[]): Promise<IMovement | null> {
      const updated = await withStatus(this, 'isSaving', () => financeService.addDocuments(movement.id, plainList(documents)));
      if (updated) this.replaceMovement(updated);
      return updated;
    },
    async makeRefund(refund: IRefund, made: Pick<IRefund, 'method' | 'reference' | 'documents'>): Promise<IRefund | null> {
      const updated = await withStatus(this, 'isSaving', () => financeService.makeRefund(refund.id, { ...made, documents: plainList(made.documents), madeBy: useSessionStore().fullName }));
      if (updated) this.replaceRefund(updated);
      return updated;
    },
    async confirmRefund(refund: IRefund): Promise<IRefund | null> {
      const updated = await withStatus(this, 'isSaving', () => financeService.confirmRefund(refund.id, useSessionStore().fullName));
      if (updated) this.replaceRefund(updated);
      return updated;
    },
    async decide(movement: IMovement, decision: Omit<IMovementDecision, 'by'>): Promise<IMovement | null> {
      const updated = await withStatus(this, 'isSaving', () => financeService.decideMovement(movement.id, { ...decision, by: useSessionStore().fullName }));
      if (updated) {
        this.replaceMovement(updated);
        await Promise.all([useLotStore().reloadLoaded(), useClientStore().fetchClients(true), this.fetchRefunds(updated.siteId), this.refreshSales()]);
      }
      return updated;
    },
    async recordPayment(payload: Omit<IRecordPaymentPayload, 'recordedBy'>): Promise<IMovement | null> {
      const movement = await withStatus(this, 'isSaving', () => financeService.recordPayment({ ...payload, lotLinks: plainList(payload.lotLinks), documents: plainList(payload.documents), recordedBy: useSessionStore().fullName }));
      if (!movement) return null;
      if (!this.movements.some((item) => item.id === movement.id)) this.movements.unshift(movement);
      await Promise.all([useLotStore().reloadLoaded(), this.refreshSales()]);
      return movement;
    },
  },
});
