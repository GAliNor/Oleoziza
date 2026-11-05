import { mockResolve } from 'global/services/mock';
import { dashboardMock } from 'dashboard/constants/mock-dashboard';
import { MOVEMENTS_DB } from 'finance/services/finance.mock';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { millingFigures } from 'finance/composables/milling-figures';
import { periodRange } from 'global/composables/use-period';
import type { IDashboard, IDashboardService } from 'dashboard/types/dashboard';
import type { PeriodKey } from 'global/types/period';

export default class DashboardMockService implements IDashboardService {
  getDashboard(siteId: string, period: PeriodKey): Promise<IDashboard> {
    const dashboard = dashboardMock(siteId, period);
    const { from, to } = periodRange('season');
    dashboard.sites = dashboard.sites.map((site) => {
      const figures = millingFigures(LOTS_MOCK_DB.filter((lot) => lot.siteId === site.siteId), MOVEMENTS_DB.filter((movement) => movement.siteId === site.siteId), from, to);
      return { ...site, revenueSeason: figures.revenue, outstanding: figures.outstanding };
    });
    return mockResolve(dashboard);
  }
}
