import BaseService, { isMockModule } from 'global/services/base';
import LotMockService from 'lot/services/lot.mock';
import { toLot, toStepPhotos, type LotAnswer } from 'lot/composables/lot-answer';
import { ALL_SITES } from 'site/constants/site';
import type { IPage, IPageQuery } from 'global/types/page';
import type { IDiscountDecision, IDiscountGift, ILot, ILotMovePayload, ILotSchedule, ILotService, IRateCorrection } from 'lot/types/lot';

const siteParams = (siteId: string): { siteId: string } | undefined => (siteId === ALL_SITES ? undefined : { siteId });

class LotApiService extends BaseService implements ILotService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/lot/lots`;

  /** « Tous les sites » sends no siteId: the backend answers every Site the User holds, in one request. */
  async getLots(siteId: string): Promise<ILot[]> {
    return (await this.request<LotAnswer[]>({ method: 'GET', url: this._BASE_API_URL, params: siteParams(siteId) })).map(toLot);
  }

  async getWithoutLine(siteId: string, page: IPageQuery): Promise<IPage<ILot>> {
    const { items, total } = await this.request<IPage<LotAnswer>>({ method: 'GET', url: `${this._BASE_API_URL}/without-line`, params: { ...siteParams(siteId), offset: page.offset, limit: page.limit } });
    return { items: items.map(toLot), total };
  }

  async getPhotos(lotId: string): Promise<ILot['stepPhotos']> {
    return toStepPhotos(await this.request<Record<string, string>>({ method: 'GET', url: `${this._BASE_API_URL}/${lotId}/photos` }));
  }

  async decideDiscount(lotId: string, decision: IDiscountDecision & { by: string }): Promise<ILot> {
    return toLot(await this.request<LotAnswer>({ method: 'POST', url: `${this._BASE_API_URL}/${lotId}/discount/decision`, data: decision, headers: { 'Idempotency-Key': decision.id } }));
  }

  async giveDiscount(lotId: string, gift: IDiscountGift & { by: string }): Promise<ILot> {
    return toLot(await this.request<LotAnswer>({ method: 'POST', url: `${this._BASE_API_URL}/${lotId}/discount`, data: gift, headers: { 'Idempotency-Key': gift.id } }));
  }

  async correctRate(lotId: string, correction: IRateCorrection): Promise<ILot> {
    return toLot(await this.request<LotAnswer>({ method: 'POST', url: `${this._BASE_API_URL}/${lotId}/rate`, data: { id: correction.id, millingRatePerKg: correction.millingRatePerKg, reason: correction.reason }, headers: { 'Idempotency-Key': correction.id } }));
  }

  async scheduleLot(lotId: string, schedule: ILotSchedule): Promise<ILot> {
    return toLot(await this.request<LotAnswer>({ method: 'PUT', url: `${this._BASE_API_URL}/${lotId}/schedule`, data: schedule, headers: { 'Idempotency-Key': schedule.id } }));
  }

  async clearMissingContact(lotId: string): Promise<ILot> {
    return toLot(await this.request<LotAnswer>({ method: 'POST', url: `${this._BASE_API_URL}/${lotId}/contact-found` }));
  }

  async moveLot(lotId: string, move: ILotMovePayload): Promise<ILot> {
    return toLot(await this.request<LotAnswer>({ method: 'POST', url: `${this._BASE_API_URL}/${lotId}/moves`, data: move, headers: { 'Idempotency-Key': move.id } }));
  }
}

export default isMockModule('lot') ? LotMockService : LotApiService;
