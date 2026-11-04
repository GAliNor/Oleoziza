import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import FinanceMockService from 'finance/services/finance.mock';
import type { IFinanceService, IMovement, IMovementDecision, ISales } from 'finance/types/finance';
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

  getSales(siteId: string, period: PeriodKey): Promise<ISales> {
    return this.request<ISales>({ method: 'GET', url: `${this._BASE_API_URL}/sites/${siteId}/sales`, params: { period } });
  }
}

export default IS_MOCK_DATA_SOURCE ? FinanceMockService : FinanceApiService;
