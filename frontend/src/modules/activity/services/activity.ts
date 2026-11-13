import BaseService, { isMockModule } from 'global/services/base';
import ActivityMockService from 'activity/services/activity.mock';
import type { IPage, IPageQuery } from 'global/types/page';
import type { IActivity, IActivityDaySummary, IActivityFilter, IActivityService } from 'activity/types/activity';

/** The backend reads which Money events to include from the session; `includeMoney` only steers the mock. */
class ActivityApiService extends BaseService implements IActivityService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getDaySummary(siteId: string, day: string): Promise<IActivityDaySummary> {
    return this.request<IActivityDaySummary>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/activity/summary`, params: { day } });
  }

  getDayPage(siteId: string, day: string, filter: IActivityFilter, page: IPageQuery): Promise<IPage<IActivity>> {
    return this.request<IPage<IActivity>>({
      method: 'GET',
      url: `${this._BASE_API_URL}/sites/${siteId}/activity`,
      params: { day, group: filter.group ?? undefined, person: filter.person ?? undefined, offset: page.offset, limit: page.limit },
    });
  }
}

export default isMockModule('activity') ? ActivityMockService : ActivityApiService;
