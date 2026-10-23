import axios from 'axios';

import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import ReceptionMockService from 'reception/services/reception.mock';
import type {
  IAddWeighingPayload,
  ILot,
  IOpenReceptionPayload,
  IReceptionService,
  ISiteReceptionSettings,
} from 'reception/types/reception';

class ReceptionApiService extends BaseService implements IReceptionService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  async getLots(siteId: string): Promise<ILot[]> {
    const config = this.getConfig({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/lots`, params: { status: 'received' } });
    const response = await axios<ILot[]>(config);
    return response.data;
  }

  async getSettings(siteId: string): Promise<ISiteReceptionSettings> {
    const config = this.getConfig({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/reception-settings` });
    const response = await axios<ISiteReceptionSettings>(config);
    return response.data;
  }

  async openReception(payload: IOpenReceptionPayload): Promise<ILot> {
    const config = this.getConfig({
      method: 'POST',
      url: `${this._BASE_API_URL}/sites/${payload.siteId}/lots`,
      data: payload,
      headers: { 'Idempotency-Key': payload.id },
    });
    const response = await axios<ILot>(config);
    return response.data;
  }

  async addWeighing(lotId: string, payload: IAddWeighingPayload): Promise<ILot> {
    const config = this.getConfig({
      method: 'POST',
      url: `${this._BASE_API_URL}/lots/${lotId}/weighings`,
      data: payload,
      headers: { 'Idempotency-Key': payload.id },
    });
    const response = await axios<ILot>(config);
    return response.data;
  }

  async finishReception(lotId: string): Promise<ILot> {
    const config = this.getConfig({ method: 'POST', url: `${this._BASE_API_URL}/lots/${lotId}/finish-reception` });
    const response = await axios<ILot>(config);
    return response.data;
  }

  async readScale(siteId: string): Promise<number> {
    const config = this.getConfig({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/scale/reading` });
    const response = await axios<{ grossKg: number }>(config);
    return response.data.grossKg;
  }
}

export default IS_MOCK_DATA_SOURCE ? ReceptionMockService : ReceptionApiService;
