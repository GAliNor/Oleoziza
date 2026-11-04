import { defineStore } from 'pinia';

import FinanceService from 'finance/services/finance';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import type { IFinanceStore, IMovement, IMovementDecision } from 'finance/types/finance';
import type { PeriodKey } from 'global/types/period';

const financeService = new FinanceService();

/** The Payments, Payouts and sales figures of the current Site. */
export const useFinanceStore = defineStore('finance', {
  state: (): IFinanceStore => ({
    movements: [],
    sales: null,
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
      const sales = await withStatus(this, 'isLoading', () => financeService.getSales(siteId, period), { errorFlag: 'hasError' });
      if (sales) this.sales = sales;
    },
    load(siteId: string, period: PeriodKey, isForced = false): Promise<void[]> {
      return Promise.all([this.fetchMovements(siteId, isForced), this.fetchSales(siteId, period)]);
    },
    async decide(movement: IMovement, decision: Omit<IMovementDecision, 'by'>): Promise<IMovement | null> {
      const updated = await withStatus(this, 'isSaving', () => financeService.decideMovement(movement.id, { ...decision, by: useSessionStore().fullName }));
      if (updated) this.movements.splice(this.movements.findIndex((item) => item.id === updated.id), 1, updated);
      return updated;
    },
  },
});
