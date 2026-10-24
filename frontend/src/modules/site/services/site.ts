import axios from 'axios';

import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import SiteAdminMockService from 'site/services/site.mock';
import type { ISite } from 'global/types/site';
import type { ISiteAdminService, ISiteForm } from 'site/types/site';

class SiteAdminApiService extends BaseService implements ISiteAdminService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/sites';

  async create(form: ISiteForm): Promise<ISite> {
    const config = this.getConfig({ method: 'POST', url: this._BASE_API_URL, data: form });
    const response = await axios<ISite>(config);
    return response.data;
  }

  async update(id: string, form: ISiteForm): Promise<ISite> {
    const config = this.getConfig({ method: 'PUT', url: `${this._BASE_API_URL}/${id}`, data: form });
    const response = await axios<ISite>(config);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    const config = this.getConfig({ method: 'DELETE', url: `${this._BASE_API_URL}/${id}` });
    await axios(config);
  }
}

export default IS_MOCK_DATA_SOURCE ? SiteAdminMockService : SiteAdminApiService;
