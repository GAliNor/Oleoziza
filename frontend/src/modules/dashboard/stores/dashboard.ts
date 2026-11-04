import { defineStore } from 'pinia';

import DashboardService from 'dashboard/services/dashboard';
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
    async fetchDashboard(siteId: string, period: PeriodKey): Promise<void> {
      const dashboard = await withStatus(this, 'isLoading', () => dashboardService.getDashboard(siteId, period), { errorFlag: 'hasError' });
      if (dashboard) this.dashboard = dashboard;
    },
  },
});
