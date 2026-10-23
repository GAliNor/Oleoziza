import axios from 'axios';

import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ClientMockService from 'global/services/client.mock';
import type { IClient, IClientService, ICreateClientPayload } from 'global/types/client';

class ClientApiService extends BaseService implements IClientService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/clients';

  async getAll(): Promise<IClient[]> {
    const config = this.getConfig({ method: 'GET', url: this._BASE_API_URL });
    const response = await axios<IClient[]>(config);
    return response.data;
  }

  async create(payload: ICreateClientPayload): Promise<IClient> {
    const config = this.getConfig({ method: 'POST', url: this._BASE_API_URL, data: payload, headers: { 'Idempotency-Key': payload.id } });
    const response = await axios<IClient>(config);
    return response.data;
  }
}

export default IS_MOCK_DATA_SOURCE ? ClientMockService : ClientApiService;
