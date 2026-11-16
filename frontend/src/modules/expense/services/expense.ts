import BaseService, { isMockModule } from 'global/services/base';
import { ALL_SITES } from 'site/constants/site';
import ExpenseMockService from 'expense/services/expense.mock';
import type { IExpense, IExpenseCancel, IExpenseCategory, IExpenseListQuery, IExpensePayload, IExpenseService, IExpenseSummary, ISupplier } from 'expense/types/expense';
import type { IPage, IPageQuery } from 'global/types/page';
import type { IPeriodRange, PeriodKey } from 'global/types/period';

/** « Tous les sites » sends no siteId: the backend answers every Site the User holds. */
const siteParams = (siteId: string): Record<string, string> => (siteId === ALL_SITES ? {} : { siteId });

class ExpenseApiService extends BaseService implements IExpenseService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/expense`;

  getCategories(): Promise<IExpenseCategory[]> {
    return this.request<IExpenseCategory[]>({ method: 'GET', url: `${this._BASE_API_URL}/categories` });
  }

  getPage(query: IExpenseListQuery, page: IPageQuery): Promise<IPage<IExpense>> {
    return this.request<IPage<IExpense>>({
      method: 'GET',
      url: `${this._BASE_API_URL}/expenses`,
      params: { ...siteParams(query.siteId), period: query.period, category: query.categoryId ?? undefined, search: query.search || undefined, offset: page.offset, limit: page.limit },
    });
  }

  getOne(id: string): Promise<IExpense> {
    return this.request<IExpense>({ method: 'GET', url: `${this._BASE_API_URL}/expenses/${id}` });
  }

  getSummary(siteId: string, period: PeriodKey): Promise<IExpenseSummary> {
    return this.request<IExpenseSummary>({ method: 'GET', url: `${this._BASE_API_URL}/expenses/summary`, params: { ...siteParams(siteId), period } });
  }

  getSuppliers(): Promise<ISupplier[]> {
    return this.request<ISupplier[]>({ method: 'GET', url: `${this._BASE_API_URL}/suppliers` });
  }

  createSupplier(supplier: ISupplier): Promise<ISupplier> {
    return this.request<ISupplier>({ method: 'POST', url: `${this._BASE_API_URL}/suppliers`, data: supplier, headers: { 'Idempotency-Key': supplier.id } });
  }

  getForExport(siteId: string, range: IPeriodRange): Promise<IExpense[]> {
    return this.request<IExpense[]>({ method: 'GET', url: `${this._BASE_API_URL}/expenses/export`, params: { ...siteParams(siteId), from: range.from, to: range.to } });
  }

  create(payload: IExpensePayload & { recordedBy: string }): Promise<IExpense> {
    return this.request<IExpense>({ method: 'POST', url: `${this._BASE_API_URL}/expenses`, data: payload, headers: { 'Idempotency-Key': payload.id } });
  }

  update(id: string, payload: IExpensePayload & { updatedBy: string }): Promise<IExpense> {
    return this.request<IExpense>({ method: 'PUT', url: `${this._BASE_API_URL}/expenses/${id}`, data: payload });
  }

  cancel(id: string, cancel: IExpenseCancel): Promise<IExpense> {
    return this.request<IExpense>({ method: 'POST', url: `${this._BASE_API_URL}/expenses/${id}/cancel`, data: cancel, headers: { 'Idempotency-Key': `expense-cancel:${id}` } });
  }
}

export default isMockModule('expense') ? ExpenseMockService : ExpenseApiService;
