import { defineStore } from 'pinia';

import DashboardService from 'dashboard/services/dashboard';
import { useExpenseStore } from 'expense/stores/expense';
import { useFinanceStore } from 'finance/stores/finance';
import { markSlot } from 'global/composables/cached-load';
import { withStatus } from 'global/composables/with-status';
import type { IDashboardStore } from 'dashboard/types/dashboard';
import type { PeriodKey } from 'global/types/period';

const dashboardService = new DashboardService();

/** The Site and period asked last: an answer to an earlier one is dropped. */
let latestQuery = '';

export const useDashboardStore = defineStore('dashboard', {
  state: (): IDashboardStore => ({
    dashboard: null,
    isLoading: false,
    hasError: false,
  }),
  actions: {
    /** The Home in one request; the sales and Expense summary it carries fill their stores, which then skip their own request. */
    async fetchDashboard(siteId: string, period: PeriodKey): Promise<void> {
      const query = `${siteId}:${period}`;
      latestQuery = query;
      const dashboard = await withStatus(this, 'isLoading', () => dashboardService.getDashboard(siteId, period), { errorFlag: 'hasError' });
      if (!dashboard || latestQuery !== query) return;
      this.dashboard = dashboard;
      if (dashboard.sales) {
        Object.assign(useFinanceStore(), { sales: dashboard.sales, salesQuery: { siteId, period } });
        markSlot('sales', `${siteId}:${period}`);
      }
      if (dashboard.expenseSummary) {
        Object.assign(useExpenseStore(), { summary: dashboard.expenseSummary, summaryQuery: { siteId, period } });
        markSlot('expense-summary', `${siteId}:${period}`);
      }
    },
  },
});
