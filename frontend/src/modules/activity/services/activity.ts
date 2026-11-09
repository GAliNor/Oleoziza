import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ActivityMockService from 'activity/services/activity.mock';
import type { IActivity, IActivityService } from 'activity/types/activity';

class ActivityApiService extends BaseService implements IActivityService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getDay(siteId: string, day: string): Promise<IActivity[]> {
    return this.request<IActivity[]>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/activity`, params: { day } });
  }
}

export default IS_MOCK_DATA_SOURCE ? ActivityMockService : ActivityApiService;
