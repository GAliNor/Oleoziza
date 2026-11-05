import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ConfigurationMockService from 'configuration/services/configuration.mock';
import type { IConfiguration, IConfigurationService, IConfigurationUpdatePayload } from 'configuration/types/configuration';

class ConfigurationApiService extends BaseService implements IConfigurationService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getOne(siteId: string): Promise<IConfiguration> {
    return this.request<IConfiguration>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/configuration` });
  }

  update(siteId: string, update: IConfigurationUpdatePayload): Promise<IConfiguration> {
    return this.request<IConfiguration>({
      method: 'PATCH',
      url: `${this._BASE_API_URL}/sites/${siteId}/configuration`,
      data: update,
      headers: { 'Idempotency-Key': update.id },
    });
  }
}

export default IS_MOCK_DATA_SOURCE ? ConfigurationMockService : ConfigurationApiService;
