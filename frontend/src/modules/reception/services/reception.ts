import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ReceptionMockService from 'reception/services/reception.mock';
import type { ILot } from 'lot/types/lot';
import type { IAddWeighingPayload, IOpenReceptionPayload, IReceptionService, ISiteReceptionSettings } from 'reception/types/reception';

class ReceptionApiService extends BaseService implements IReceptionService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getSettings(siteId: string): Promise<ISiteReceptionSettings> {
    return this.request<ISiteReceptionSettings>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/reception-settings` });
  }

  openReception(payload: IOpenReceptionPayload): Promise<ILot> {
    return this.request<ILot>({
      method: 'POST',
      url: `${this._BASE_API_URL}/sites/${payload.siteId}/lots`,
      data: payload,
      headers: { 'Idempotency-Key': payload.id },
    });
  }

  addWeighing(lotId: string, payload: IAddWeighingPayload): Promise<ILot> {
    return this.request<ILot>({
      method: 'POST',
      url: `${this._BASE_API_URL}/lots/${lotId}/weighings`,
      data: payload,
      headers: { 'Idempotency-Key': payload.id },
    });
  }

  finishReception(lotId: string): Promise<ILot> {
    return this.request<ILot>({
      method: 'POST',
      url: `${this._BASE_API_URL}/lots/${lotId}/finish-reception`,
      headers: { 'Idempotency-Key': `finish-reception:${lotId}` },
    });
  }

  async readScale(siteId: string): Promise<number> {
    const reading = await this.request<{ grossKg: number }>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/scale/reading` });
    return reading.grossKg;
  }
}

export default IS_MOCK_DATA_SOURCE ? ReceptionMockService : ReceptionApiService;
