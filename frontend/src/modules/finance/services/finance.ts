import BaseService, { isMockModule } from 'global/services/base';
import FinanceMockService from 'finance/services/finance.mock';
import { toSales, type ISalesAnswer } from 'finance/composables/sales-buckets';
import { ALL_SITES } from 'site/constants/site';
import type { IDebtContact, IDebtContactPayload, IFinanceService, ILotPaymentLink, IMovement, IMovementDecision, IMovementListQuery, IPaymentDocument, IRecordPaymentPayload, IRefund, ISales } from 'finance/types/finance';
import type { IPage, IPageQuery } from 'global/types/page';
import type { PeriodKey } from 'global/types/period';

/** « Tous les sites » sends no siteId: the backend answers every Site the User holds. */
const siteParams = (siteId: string): Record<string, string> => (siteId === ALL_SITES ? {} : { siteId });

class FinanceApiService extends BaseService implements IFinanceService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/finance`;

  getMovements(siteId: string): Promise<IMovement[]> {
    return this.request<IMovement[]>({ method: 'GET', url: `${this._BASE_API_URL}/payments`, params: siteParams(siteId) });
  }

  getMovementPage(query: IMovementListQuery, page: IPageQuery): Promise<IPage<IMovement>> {
    return this.request<IPage<IMovement>>({
      method: 'GET',
      url: `${this._BASE_API_URL}/payments/page`,
      params: { ...siteParams(query.siteId), list: query.list, search: query.search, period: query.period, offset: page.offset, limit: page.limit },
    });
  }

  getRefundPage(siteId: string, page: IPageQuery): Promise<IPage<IRefund>> {
    return this.request<IPage<IRefund>>({ method: 'GET', url: `${this._BASE_API_URL}/refunds/page`, params: { ...siteParams(siteId), offset: page.offset, limit: page.limit } });
  }

  decideMovement(id: string, decision: IMovementDecision): Promise<IMovement> {
    const { status, note, settlement } = decision;
    return this.request<IMovement>({ method: 'POST', url: `${this._BASE_API_URL}/payments/${id}/decision`, data: { status, note, settlement } });
  }

  linkLots(id: string, lotLinks: ILotPaymentLink[]): Promise<IMovement> {
    return this.request<IMovement>({ method: 'PUT', url: `${this._BASE_API_URL}/payments/${id}/lots`, data: lotLinks });
  }

  addDocuments(id: string, documents: IPaymentDocument[]): Promise<IMovement> {
    return this.request<IMovement>({ method: 'POST', url: `${this._BASE_API_URL}/payments/${id}/documents`, data: documents });
  }

  getRefunds(siteId: string): Promise<IRefund[]> {
    return this.request<IRefund[]>({ method: 'GET', url: `${this._BASE_API_URL}/refunds`, params: siteParams(siteId) });
  }

  makeRefund(id: string, made: Pick<IRefund, 'method' | 'reference' | 'documents' | 'madeBy'>): Promise<IRefund> {
    const { method, reference, documents } = made;
    return this.request<IRefund>({ method: 'POST', url: `${this._BASE_API_URL}/refunds/${id}/made`, data: { method, reference, documents }, headers: { 'Idempotency-Key': `refund-made:${id}` } });
  }

  confirmRefund(id: string): Promise<IRefund> {
    return this.request<IRefund>({ method: 'POST', url: `${this._BASE_API_URL}/refunds/${id}/confirm`, headers: { 'Idempotency-Key': `refund-confirm:${id}` } });
  }

  recordPayment(payload: IRecordPaymentPayload): Promise<IMovement> {
    return this.request<IMovement>({ method: 'POST', url: `${this._BASE_API_URL}/payments`, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }

  /** The backend computes the figures and buckets; the bars get the same labels as before: a weekday, or « S1 », « S2 »… */
  async getSales(siteId: string, period: PeriodKey): Promise<ISales> {
    return toSales(await this.request<ISalesAnswer>({ method: 'GET', url: `${this._BASE_API_URL}/sales`, params: { ...siteParams(siteId), period } }));
  }

  getDebtContacts(siteId: string): Promise<IDebtContact[]> {
    return this.request<IDebtContact[]>({ method: 'GET', url: `${this._BASE_API_URL}/debt-contacts`, params: siteParams(siteId) });
  }

  addDebtContact(payload: IDebtContactPayload): Promise<IDebtContact> {
    return this.request<IDebtContact>({ method: 'POST', url: `${this._BASE_API_URL}/debt-contacts`, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }
}

export default isMockModule('finance') ? FinanceMockService : FinanceApiService;
