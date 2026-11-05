import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ReceptionMockService from 'reception/services/reception.mock';
import type { ILot } from 'lot/types/lot';
import type { IReceiveLotPayload, IReceptionService, ISiteReceptionSettings } from 'reception/types/reception';

class ReceptionApiService extends BaseService implements IReceptionService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getSettings(siteId: string): Promise<ISiteReceptionSettings> {
    return this.request<ISiteReceptionSettings>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/reception-settings` });
  }

  receiveLot(payload: IReceiveLotPayload): Promise<ILot> {
    return this.request<ILot>({
      method: 'POST',
      url: `${this._BASE_API_URL}/sites/${payload.siteId}/lots`,
      data: payload,
      headers: { 'Idempotency-Key': payload.id },
    });
  }
}

export default IS_MOCK_DATA_SOURCE ? ReceptionMockService : ReceptionApiService;
