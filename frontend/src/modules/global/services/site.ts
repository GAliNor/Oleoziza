import axios from 'axios';

import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import SiteMockService from 'global/services/site.mock';
import type { ISite, ISiteService } from 'global/types/site';

class SiteApiService extends BaseService implements ISiteService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/sites';

  async getAll(): Promise<ISite[]> {
    const config = this.getConfig({ method: 'GET', url: this._BASE_API_URL });
    const response = await axios<ISite[]>(config);
    return response.data;
  }
}

export default IS_MOCK_DATA_SOURCE ? SiteMockService : SiteApiService;
