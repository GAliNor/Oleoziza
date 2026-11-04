import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ClientMockService from 'client/services/client.mock';
import type { IClient, IClientService, ICreateClientPayload } from 'client/types/client';

class ClientApiService extends BaseService implements IClientService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/clients';

  getAll(): Promise<IClient[]> {
    return this.request<IClient[]>({ method: 'GET', url: this._BASE_API_URL });
  }

  create(payload: ICreateClientPayload): Promise<IClient> {
    return this.request<IClient>({ method: 'POST', url: this._BASE_API_URL, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }
}

export default IS_MOCK_DATA_SOURCE ? ClientMockService : ClientApiService;
