import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import SiteMockService from 'global/services/site.mock';
import type { ISite, ISiteService } from 'global/types/site';

class SiteApiService extends BaseService implements ISiteService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/sites';

  getAll(): Promise<ISite[]> {
    return this.request<ISite[]>({ method: 'GET', url: this._BASE_API_URL });
  }
}

export default IS_MOCK_DATA_SOURCE ? SiteMockService : SiteApiService;
