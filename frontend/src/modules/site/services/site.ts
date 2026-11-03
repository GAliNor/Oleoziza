import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import SiteAdminMockService from 'site/services/site.mock';
import type { ISite } from 'global/types/site';
import type { ISiteAdminService, ISiteForm } from 'site/types/site';

class SiteAdminApiService extends BaseService implements ISiteAdminService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/sites';

  create(form: ISiteForm): Promise<ISite> {
    return this.request<ISite>({ method: 'POST', url: this._BASE_API_URL, data: form });
  }

  update(id: string, form: ISiteForm): Promise<ISite> {
    return this.request<ISite>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}`, data: form });
  }

  delete(id: string): Promise<void> {
    return this.request<void>({ method: 'DELETE', url: `${this._BASE_API_URL}/${id}` });
  }
}

export default IS_MOCK_DATA_SOURCE ? SiteAdminMockService : SiteAdminApiService;
