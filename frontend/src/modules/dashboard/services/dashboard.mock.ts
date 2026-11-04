import { mockResolve } from 'global/services/mock';
import { dashboardMock } from 'dashboard/constants/mock-dashboard';
import type { IDashboard, IDashboardService } from 'dashboard/types/dashboard';
import type { PeriodKey } from 'global/types/period';

export default class DashboardMockService implements IDashboardService {
  getDashboard(siteId: string, period: PeriodKey): Promise<IDashboard> {
    return mockResolve(dashboardMock(siteId, period));
  }
}
