import BaseService, { isMockModule } from 'global/services/base';
import ConfigurationMockService from 'configuration/services/configuration.mock';
import type { IConfiguration, IConfigurationService, IConfigurationUpdatePayload } from 'configuration/types/configuration';

class ConfigurationApiService extends BaseService implements IConfigurationService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  /** Several Sites in one request: `siteId` repeats (`siteId=a&siteId=b`). */
  getAll(siteIds: string[], seasonId?: string): Promise<IConfiguration[]> {
    const params = new URLSearchParams(siteIds.map((siteId) => ['siteId', siteId]));
    if (seasonId) params.append('seasonId', seasonId);
    return this.request<IConfiguration[]>({ method: 'GET', url: `${this._BASE_API_URL}/configuration`, params });
  }

  cancelPriceChange(siteId: string, changeId: string): Promise<IConfiguration> {
    return this.request<IConfiguration>({ method: 'DELETE', url: `${this._BASE_API_URL}/configuration/${siteId}/price-changes/${changeId}` });
  }

  update(siteId: string, update: IConfigurationUpdatePayload): Promise<IConfiguration> {
    return this.request<IConfiguration>({
      method: 'PATCH',
      url: `${this._BASE_API_URL}/configuration/${siteId}`,
      data: update,
      headers: { 'Idempotency-Key': update.id },
    });
  }
}

export default isMockModule('configuration') ? ConfigurationMockService : ConfigurationApiService;
