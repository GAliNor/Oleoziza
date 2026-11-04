import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import LotMockService from 'lot/services/lot.mock';
import type { ILot, ILotMovePayload, ILotService } from 'lot/types/lot';

class LotApiService extends BaseService implements ILotService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getLots(siteId: string): Promise<ILot[]> {
    return this.request<ILot[]>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/lots` });
  }

  moveLot(lotId: string, move: ILotMovePayload): Promise<ILot> {
    return this.request<ILot>({ method: 'POST', url: `${this._BASE_API_URL}/lots/${lotId}/moves`, data: move, headers: { 'Idempotency-Key': move.id } });
  }
}

export default IS_MOCK_DATA_SOURCE ? LotMockService : LotApiService;
