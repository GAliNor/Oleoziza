import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import LotMockService from 'lot/services/lot.mock';
import type { ILot, ILotService } from 'lot/types/lot';

class LotApiService extends BaseService implements ILotService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getLots(siteId: string): Promise<ILot[]> {
    return this.request<ILot[]>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/lots` });
  }
}

export default IS_MOCK_DATA_SOURCE ? LotMockService : LotApiService;
