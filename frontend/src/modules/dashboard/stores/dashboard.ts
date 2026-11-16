import { defineStore } from 'pinia';

import DashboardService from 'dashboard/services/dashboard';
import { useExpenseStore } from 'expense/stores/expense';
import { useFinanceStore } from 'finance/stores/finance';
import { markLoaded } from 'global/composables/cached-load';
import { withStatus } from 'global/composables/with-status';
import type { IDashboardStore } from 'dashboard/types/dashboard';
import type { PeriodKey } from 'global/types/period';

const dashboardService = new DashboardService();

export const useDashboardStore = defineStore('dashboard', {
  state: (): IDashboardStore => ({
    dashboard: null,
    isLoading: false,
    hasError: false,
  }),
  actions: {
    /** The Home in one request; the sales and Expense summary it carries fill their stores, which then skip their own request. */
    async fetchDashboard(siteId: string, period: PeriodKey): Promise<void> {
      const dashboard = await withStatus(this, 'isLoading', () => dashboardService.getDashboard(siteId, period), { errorFlag: 'hasError' });
      if (!dashboard) return;
      this.dashboard = dashboard;
      if (dashboard.sales) {
        Object.assign(useFinanceStore(), { sales: dashboard.sales, salesQuery: { siteId, period } });
        markLoaded(`sales:${siteId}:${period}`);
      }
      if (dashboard.expenseSummary) {
        Object.assign(useExpenseStore(), { summary: dashboard.expenseSummary, summaryQuery: { siteId, period } });
        markLoaded(`expense-summary:${siteId}:${period}`);
      }
    },
  },
});
