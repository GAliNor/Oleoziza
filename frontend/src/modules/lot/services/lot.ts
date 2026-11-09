import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import LotMockService from 'lot/services/lot.mock';
import type { IDiscountDecision, IDiscountGift, ILot, ILotMovePayload, ILotSchedule, ILotService } from 'lot/types/lot';

class LotApiService extends BaseService implements ILotService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getLots(siteId: string): Promise<ILot[]> {
    return this.request<ILot[]>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/lots` });
  }

  decideDiscount(lotId: string, decision: IDiscountDecision & { by: string }): Promise<ILot> {
    return this.request<ILot>({ method: 'POST', url: `${this._BASE_API_URL}/lots/${lotId}/discount/decision`, data: decision, headers: { 'Idempotency-Key': decision.id } });
  }

  giveDiscount(lotId: string, gift: IDiscountGift & { by: string }): Promise<ILot> {
    return this.request<ILot>({ method: 'POST', url: `${this._BASE_API_URL}/lots/${lotId}/discount`, data: gift, headers: { 'Idempotency-Key': gift.id } });
  }

  scheduleLot(lotId: string, schedule: ILotSchedule): Promise<ILot> {
    return this.request<ILot>({ method: 'PUT', url: `${this._BASE_API_URL}/lots/${lotId}/schedule`, data: schedule, headers: { 'Idempotency-Key': schedule.id } });
  }

  clearMissingContact(lotId: string): Promise<ILot> {
    return this.request<ILot>({ method: 'POST', url: `${this._BASE_API_URL}/lots/${lotId}/contact-found` });
  }

  moveLot(lotId: string, move: ILotMovePayload): Promise<ILot> {
    return this.request<ILot>({ method: 'POST', url: `${this._BASE_API_URL}/lots/${lotId}/moves`, data: move, headers: { 'Idempotency-Key': move.id } });
  }
}

export default IS_MOCK_DATA_SOURCE ? LotMockService : LotApiService;
