import BaseService, { isMockModule } from 'global/services/base';
import ReceptionMockService from 'reception/services/reception.mock';
import type { ILot } from 'lot/types/lot';
import type { IReceiveLotPayload, IReceptionService } from 'reception/types/reception';

class ReceptionApiService extends BaseService implements IReceptionService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/lot/lots`;

  receiveLot(payload: IReceiveLotPayload): Promise<ILot> {
    return this.request<ILot>({ method: 'POST', url: this._BASE_API_URL, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }
}

export default isMockModule('reception') ? ReceptionMockService : ReceptionApiService;
