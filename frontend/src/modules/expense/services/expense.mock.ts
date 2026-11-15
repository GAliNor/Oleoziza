import { mockReject, mockResolve } from 'global/services/mock';
import { todayIso } from 'global/composables/date';
import { periodRange } from 'global/composables/use-period';
import { slicePage } from 'global/composables/page';
import { foldText } from 'global/composables/select-options';
import { SEASON_START } from 'global/constants/period';
import { ALL_SITES } from 'site/constants/site';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { categoryIdOf, summarizeExpenses } from 'expense/composables/expense-amounts';
import { EXPENSE_CATEGORIES_MOCK } from 'expense/constants/expense-categories';
import { EXPENSES_MOCK } from 'expense/constants/mock-expenses';
import { VAT_RATES } from 'expense/constants/expense';
import type { IExpense, IExpenseCancel, IExpenseCategory, IExpenseListQuery, IExpensePayload, IExpenseService, IExpenseSummary, ISupplier } from 'expense/types/expense';
import type { IPage, IPageQuery } from 'global/types/page';
import type { IPeriodRange, PeriodKey } from 'global/types/period';

export const SUPPLIERS_DB: ISupplier[] = [];

/** Suppliers read once from the past Expenses, newest tax ids kept; each Expense then points at its Supplier. */
export const EXPENSES_DB: IExpense[] = structuredClone(EXPENSES_MOCK).map((expense) => {
  let supplier = SUPPLIERS_DB.find((item) => foldText(item.name) === foldText(expense.supplier));
  if (!supplier) {
    supplier = { id: `supplier-${SUPPLIERS_DB.length + 1}`, name: expense.supplier, ice: expense.supplierIce, taxId: expense.supplierIf };
    SUPPLIERS_DB.push(supplier);
  }
  return { ...expense, supplierId: supplier.id };
});

const SITE_CODES: Record<string, string> = { [SITE_OUJDA_ID]: 'OJ', [SITE_BERKANE_ID]: 'BK' };

const ofSite = (siteId: string): IExpense[] => (siteId === ALL_SITES ? EXPENSES_DB : EXPENSES_DB.filter((expense) => expense.siteId === siteId));

const inPeriod = (expenses: IExpense[], period: PeriodKey): IExpense[] => {
  const { from, to } = periodRange(period);
  return expenses.filter((expense) => expense.date >= from && expense.date <= to);
};

const byNewest = (first: IExpense, second: IExpense): number => second.date.localeCompare(first.date) || second.recordedAt.localeCompare(first.recordedAt);

const matches = (expense: IExpense, search: string): boolean => {
  const needle = search.trim().toLowerCase();
  return !needle || [expense.description, expense.supplier, expense.code ?? '', expense.invoiceNumber].some((value) => value.toLowerCase().includes(needle));
};

const nextCode = (siteId: string, date: string): string => {
  const season = date >= SEASON_START ? '2627' : '2526';
  const prefix = `${SITE_CODES[siteId] ?? 'XX'}-C${season}-`;
  const last = Math.max(0, ...EXPENSES_DB.filter((expense) => expense.code?.startsWith(prefix)).map((expense) => Number(expense.code?.slice(prefix.length))));
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
};

/** The server's checks: a known sub-category, a positive amount, a 2026 TVA rate, a 15-digit ICE, a date neither ahead nor in a closed Season. */
const invalidReason = (payload: IExpensePayload): string | null => {
  const category = EXPENSE_CATEGORIES_MOCK.find((item) => item.id === payload.categoryId);
  if (!category || category.type !== 'subcategory') return 'expense_category_invalid';
  if (!(payload.amount > 0)) return 'expense_amount_invalid';
  if (payload.vatRate !== null && !VAT_RATES.includes(payload.vatRate)) return 'expense_vat_rate_invalid';
  if (payload.supplierIce && !/^\d{15}$/.test(payload.supplierIce)) return 'expense_ice_invalid';
  if (payload.date > todayIso()) return 'expense_date_ahead';
  if (payload.date < SEASON_START) return 'season_closed';
  return null;
};

export default class ExpenseMockService implements IExpenseService {
  getCategories(): Promise<IExpenseCategory[]> {
    return mockResolve(EXPENSE_CATEGORIES_MOCK);
  }

  getPage(query: IExpenseListQuery, page: IPageQuery): Promise<IPage<IExpense>> {
    const rows = inPeriod(ofSite(query.siteId), query.period)
      .filter((expense) => !query.categoryId || expense.categoryId === query.categoryId || categoryIdOf(EXPENSE_CATEGORIES_MOCK, expense.categoryId) === query.categoryId)
      .filter((expense) => matches(expense, query.search))
      .sort(byNewest);
    return mockResolve(slicePage(rows, page));
  }

  getOne(id: string): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    return expense ? mockResolve(expense) : mockReject(new Error('expense_not_found'));
  }

  getSummary(siteId: string, period: PeriodKey): Promise<IExpenseSummary> {
    return mockResolve(summarizeExpenses(inPeriod(ofSite(siteId), period), EXPENSE_CATEGORIES_MOCK));
  }

  getSuppliers(): Promise<ISupplier[]> {
    return mockResolve([...SUPPLIERS_DB].sort((first, second) => first.name.localeCompare(second.name)));
  }

  /** One Supplier per name: creating a name that exists gives back the existing one. */
  createSupplier(supplier: ISupplier): Promise<ISupplier> {
    const known = SUPPLIERS_DB.find((item) => item.id === supplier.id || foldText(item.name) === foldText(supplier.name));
    if (known) return mockResolve(known);
    if (!supplier.name.trim()) return mockReject(new Error('supplier_name_required'));
    if (supplier.ice && !/^\d{15}$/.test(supplier.ice)) return mockReject(new Error('expense_ice_invalid'));
    const created = { ...supplier, name: supplier.name.trim() };
    SUPPLIERS_DB.push(created);
    return mockResolve(created);
  }

  getForExport(siteId: string, range: IPeriodRange): Promise<IExpense[]> {
    const rows = ofSite(siteId).filter((expense) => expense.date >= range.from && expense.date <= range.to);
    return mockResolve(rows.sort((first, second) => -byNewest(first, second)));
  }

  create(payload: IExpensePayload & { recordedBy: string }): Promise<IExpense> {
    const known = EXPENSES_DB.find((expense) => expense.id === payload.id);
    if (known) return mockResolve(known);
    const reason = invalidReason(payload);
    if (reason) return mockReject(new Error(reason));
    const { recordedBy, ...fields } = payload;
    const expense: IExpense = { ...fields, code: nextCode(payload.siteId, payload.date), status: 'recorded', recordedBy, recordedAt: new Date().toISOString() };
    EXPENSES_DB.unshift(expense);
    return mockResolve(expense);
  }

  update(id: string, payload: IExpensePayload & { updatedBy: string }): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    if (!expense) return mockReject(new Error('expense_not_found'));
    if (expense.status === 'cancelled') return mockReject(new Error('expense_cancelled'));
    if (expense.date < SEASON_START) return mockReject(new Error('season_closed'));
    const reason = invalidReason(payload);
    if (reason) return mockReject(new Error(reason));
    const { updatedBy, id: _id, siteId: _siteId, ...fields } = payload;
    Object.assign(expense, fields, { updatedBy, updatedAt: new Date().toISOString() });
    return mockResolve(expense);
  }

  cancel(id: string, cancel: IExpenseCancel): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    if (!expense) return mockReject(new Error('expense_not_found'));
    if (expense.status === 'cancelled') return mockResolve(expense);
    if (expense.date < SEASON_START) return mockReject(new Error('season_closed'));
    if (!cancel.reason.trim()) return mockReject(new Error('expense_reason_required'));
    Object.assign(expense, { status: 'cancelled', cancelReason: cancel.reason.trim(), cancelledBy: cancel.by, cancelledAt: new Date().toISOString() });
    return mockResolve(expense);
  }
}
