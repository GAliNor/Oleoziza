import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import DashboardMockService from 'dashboard/services/dashboard.mock';
import type { IDashboard, IDashboardService } from 'dashboard/types/dashboard';
import type { PeriodKey } from 'global/types/period';

class DashboardApiService extends BaseService implements IDashboardService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getDashboard(siteId: string, period: PeriodKey): Promise<IDashboard> {
    return this.request<IDashboard>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/dashboard`, params: { period } });
  }
}

export default IS_MOCK_DATA_SOURCE ? DashboardMockService : DashboardApiService;
