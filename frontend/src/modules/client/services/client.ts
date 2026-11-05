import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ClientMockService from 'client/services/client.mock';
import type { IClient, IClientAccount, IClientRecord, IClientService, IClientContact, IClientLotLine, ICreateClientPayload } from 'client/types/client';

class ClientApiService extends BaseService implements IClientService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/clients';

  getAll(): Promise<IClient[]> {
    return this.request<IClient[]>({ method: 'GET', url: this._BASE_API_URL });
  }

  getRecords(): Promise<IClientRecord[]> {
    return this.request<IClientRecord[]>({ method: 'GET', url: `${this._BASE_API_URL}/records` });
  }

  getAccount(clientId: string): Promise<IClientAccount> {
    return this.request<IClientAccount>({ method: 'GET', url: `${this._BASE_API_URL}/${clientId}/account` });
  }

  create(payload: ICreateClientPayload): Promise<IClient> {
    return this.request<IClient>({ method: 'POST', url: this._BASE_API_URL, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }

  getHistory(clientId: string, siteId: string): Promise<IClientLotLine[]> {
    return this.request<IClientLotLine[]>({ method: 'GET', url: `${this._BASE_API_URL}/${clientId}/history?siteId=${encodeURIComponent(siteId)}` });
  }

  updateContact(clientId: string, contact: IClientContact): Promise<IClient> {
    return this.request<IClient>({ method: 'PATCH', url: `${this._BASE_API_URL}/${clientId}/contact`, data: contact });
  }
}

export default IS_MOCK_DATA_SOURCE ? ClientMockService : ClientApiService;
