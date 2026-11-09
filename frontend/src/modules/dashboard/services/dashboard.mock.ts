import { mockResolve } from 'global/services/mock';
import { dashboardMock } from 'dashboard/constants/mock-dashboard';
import { MOVEMENTS_DB } from 'finance/services/finance.mock';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { millingFigures } from 'finance/composables/milling-figures';
import { periodRange } from 'global/composables/use-period';
import { configurationOf } from 'configuration/services/configuration.mock';
import { tankPlanning } from 'dashboard/composables/tank-planning';
import { todayIso } from 'global/composables/date';
import { i18n } from '~/plugins/i18n';
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
    const sites = dashboard.sites.map((site) => ({ siteId: site.siteId, siteName: site.name, tanks: configurationOf(site.siteId).tanks }));
    Object.assign(dashboard, tankPlanning(sites, LOTS_MOCK_DB, todayIso(), i18n.global.t('dashboard.tanks.millOwner')));
    return mockResolve(dashboard);
  }
}
