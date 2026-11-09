import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import FinanceMockService from 'finance/services/finance.mock';
import type { IDebtContact, IDebtContactPayload, IFinanceService, ILotPaymentLink, IMovement, IMovementDecision, IPaymentDocument, IRecordPaymentPayload, IRefund, ISales } from 'finance/types/finance';
import type { PeriodKey } from 'global/types/period';

class FinanceApiService extends BaseService implements IFinanceService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL;

  getMovements(siteId: string): Promise<IMovement[]> {
    return this.request<IMovement[]>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/movements` });
  }

  decideMovement(id: string, decision: IMovementDecision): Promise<IMovement> {
    return this.request<IMovement>({
      method: 'POST',
      url: `${this._BASE_API_URL}/movements/${id}/decision`,
      data: decision,
      headers: { 'Idempotency-Key': `decide:${id}:${decision.status}` },
    });
  }

  linkLots(id: string, lotLinks: ILotPaymentLink[]): Promise<IMovement> {
    return this.request<IMovement>({ method: 'PUT', url: `${this._BASE_API_URL}/movements/${id}/lots`, data: lotLinks });
  }

  addDocuments(id: string, documents: IPaymentDocument[]): Promise<IMovement> {
    return this.request<IMovement>({ method: 'POST', url: `${this._BASE_API_URL}/movements/${id}/documents`, data: documents });
  }

  getRefunds(siteId: string): Promise<IRefund[]> {
    return this.request<IRefund[]>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/refunds` });
  }

  makeRefund(id: string, made: Pick<IRefund, 'method' | 'reference' | 'documents' | 'madeBy'>): Promise<IRefund> {
    return this.request<IRefund>({ method: 'POST', url: `${this._BASE_API_URL}/refunds/${id}/made`, data: made, headers: { 'Idempotency-Key': `refund-made:${id}` } });
  }

  confirmRefund(id: string, by: string): Promise<IRefund> {
    return this.request<IRefund>({ method: 'POST', url: `${this._BASE_API_URL}/refunds/${id}/confirm`, data: { by }, headers: { 'Idempotency-Key': `refund-confirm:${id}` } });
  }

  recordPayment(payload: IRecordPaymentPayload): Promise<IMovement> {
    return this.request<IMovement>({ method: 'POST', url: `${this._BASE_API_URL}/sites/${payload.siteId}/payments`, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }

  getSales(siteId: string, period: PeriodKey): Promise<ISales> {
    return this.request<ISales>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/sales`, params: { period } });
  }

  getDebtContacts(siteId: string): Promise<IDebtContact[]> {
    return this.request<IDebtContact[]>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/debt-contacts` });
  }

  addDebtContact(payload: IDebtContactPayload): Promise<IDebtContact> {
    return this.request<IDebtContact>({ method: 'POST', url: `${this._BASE_API_URL}/sites/${payload.siteId}/debt-contacts`, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }
}

export default IS_MOCK_DATA_SOURCE ? FinanceMockService : FinanceApiService;
