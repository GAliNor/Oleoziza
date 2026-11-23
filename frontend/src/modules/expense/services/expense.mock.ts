import { mockReject, mockResolve } from 'global/services/mock';
import { ApiRefusal } from 'global/services/api-error';
import { createId } from 'global/composables/crypto';
import { todayIso } from 'global/composables/date';
import { periodRange } from 'global/composables/use-period';
import { slicePage } from 'global/composables/page';
import { foldText } from 'global/composables/select-options';
import { seasonDates } from 'global/composables/season-dates';
import { ALL_SITES } from 'site/constants/site';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { categoryIdOf, summarizeExpenses } from 'expense/composables/expense-amounts';
import { EXPENSE_CATEGORIES_MOCK } from 'expense/constants/expense-categories';
import { EXPENSES_MOCK } from 'expense/constants/mock-expenses';
import { VAT_RATES } from 'expense/constants/expense';
import { nextDueOn } from 'expense/composables/expense-due';
import type { ExpensePaymentState, IExpense, IExpenseCancel, IExpenseCategory, IExpenseListQuery, IExpensePayload, IExpensePayment, IExpenseService, IExpenseSummary, IExpenseToPay, ISupplier } from 'expense/types/expense';
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
  return expenses.filter((expense) => expense.date !== null && expense.date >= from && expense.date <= to);
};

const byNewest = (first: IExpense, second: IExpense): number => (second.date ?? '').localeCompare(first.date ?? '') || second.recordedAt.localeCompare(first.recordedAt);

const matches = (expense: IExpense, search: string): boolean => {
  const needle = search.trim().toLowerCase();
  return !needle || [expense.description, expense.supplier, expense.code ?? '', expense.invoiceNumber].some((value) => value.toLowerCase().includes(needle));
};

const nextCode = (siteId: string, date: string): string => {
  const season = date >= seasonDates.value.currentFrom ? '2627' : '2526';
  const prefix = `${SITE_CODES[siteId] ?? 'XX'}-C${season}-`;
  const last = Math.max(0, ...EXPENSES_DB.filter((expense) => expense.code?.startsWith(prefix)).map((expense) => Number(expense.code?.slice(prefix.length))));
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
};

/** The server's checks: a known sub-category, a 2026 TVA rate, a 15-digit ICE, a due date to pay, and date, amount and way of paying once paid. */
const invalidReason = (payload: IExpensePayload, paymentState: ExpensePaymentState): string | null => {
  const category = EXPENSE_CATEGORIES_MOCK.find((item) => item.id === payload.categoryId);
  if (!category || category.type !== 'subcategory') return 'category_invalid';
  if (payload.vatRate !== null && !VAT_RATES.includes(payload.vatRate)) return 'vat_rate_invalid';
  if (payload.supplierIce && !/^\d{15}$/.test(payload.supplierIce)) return 'ice_invalid';
  if (paymentState === 'to_pay') return payload.dueOn ? null : 'due_date_required';
  if (!payload.date || !payload.amount || !payload.paidBy) return 'payment_incomplete';
  if (payload.date > todayIso()) return 'date_in_future';
  return payload.date < seasonDates.value.currentFrom ? 'season_closed' : null;
};

const refuse = (code: string): Promise<never> => mockReject(new ApiRefusal(code));

const isToPay = (expense: IExpense): boolean => expense.paymentState === 'to_pay' && expense.status === 'recorded';

const toPayOf = (expenses: readonly IExpense[]): IExpenseToPay => {
  const rows = expenses.filter(isToPay);
  return { count: rows.length, amount: rows.reduce((sum, expense) => sum + (expense.amount ?? 0), 0), lateCount: rows.filter((expense) => (expense.dueOn ?? '') < todayIso()).length, unknownAmountCount: rows.filter((expense) => expense.amount === null).length };
};

/** The next occurrence copies the last one, as the server does. */
const createNext = (expense: IExpense): void => {
  if (!expense.frequency || !expense.recurringExpenseId) return;
  const from = expense.dueOn ?? expense.date ?? todayIso();
  const dueOn = nextDueOn(from, expense.frequency);
  if (EXPENSES_DB.some((other) => other.recurringExpenseId === expense.recurringExpenseId && (other.dueOn ?? '') >= dueOn)) return;
  EXPENSES_DB.unshift({ ...structuredClone(expense), id: createId(), code: null, paymentState: 'to_pay', dueOn, date: null, paidBy: null, paymentReference: '', invoiceNumber: '', invoiceDate: null, documents: [], seasonId: null, seasonLabel: null });
};

export default class ExpenseMockService implements IExpenseService {
  getCategories(): Promise<IExpenseCategory[]> {
    return mockResolve(EXPENSE_CATEGORIES_MOCK);
  }

  getPage(query: IExpenseListQuery, page: IPageQuery): Promise<IPage<IExpense>> {
    const scope = query.paymentState === 'to_pay' ? ofSite(query.siteId).filter(isToPay) : inPeriod(ofSite(query.siteId), query.period);
    const rows = scope
      .filter((expense) => !query.categoryId || expense.categoryId === query.categoryId || categoryIdOf(EXPENSE_CATEGORIES_MOCK, expense.categoryId) === query.categoryId)
      .filter((expense) => matches(expense, query.search))
      .sort(query.paymentState === 'to_pay' ? (first, second) => (first.dueOn ?? '').localeCompare(second.dueOn ?? '') : byNewest);
    return mockResolve(slicePage(rows, page));
  }

  getOne(id: string): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    return expense ? mockResolve(expense) : mockReject(new Error('expense_not_found'));
  }

  getSummary(siteId: string, period: PeriodKey): Promise<IExpenseSummary> {
    return mockResolve(summarizeExpenses(inPeriod(ofSite(siteId), period), EXPENSE_CATEGORIES_MOCK, toPayOf(ofSite(siteId))));
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
    const rows = ofSite(siteId).filter((expense) => expense.date !== null && expense.date >= range.from && expense.date <= range.to);
    return mockResolve(rows.sort((first, second) => -byNewest(first, second)));
  }

  create(payload: IExpensePayload & { recordedBy: string }): Promise<IExpense> {
    const known = EXPENSES_DB.find((expense) => expense.id === payload.id);
    if (known) return mockResolve(known);
    const reason = invalidReason(payload, payload.paymentState);
    if (reason) return refuse(reason);
    const { recordedBy, ...fields } = payload;
    const isPaid = payload.paymentState === 'paid';
    const expense: IExpense = {
      ...fields,
      ...(isPaid ? {} : { date: null, paidBy: null }),
      code: isPaid ? nextCode(payload.siteId, payload.date ?? todayIso()) : null,
      seasonId: null,
      seasonLabel: isPaid ? 'Saison 2026-2027' : null,
      isLocked: false,
      recurringExpenseId: payload.frequency ? createId() : null,
      status: 'recorded',
      recordedBy,
      recordedAt: new Date().toISOString(),
    };
    EXPENSES_DB.unshift(expense);
    if (isPaid) createNext(expense);
    return mockResolve(expense);
  }

  update(id: string, payload: IExpensePayload & { updatedBy: string }): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    if (!expense) return refuse('expense_not_found');
    if (expense.status === 'cancelled') return refuse('expense_cancelled');
    if (expense.isLocked) return refuse('season_closed');
    const reason = invalidReason(payload, expense.paymentState);
    if (reason) return refuse(reason);
    const { updatedBy, id: _id, siteId: _siteId, paymentState: _state, ...fields } = payload;
    Object.assign(expense, fields, { updatedBy, updatedAt: new Date().toISOString(), recurringExpenseId: expense.recurringExpenseId ?? (payload.frequency ? createId() : null) });
    return mockResolve(expense);
  }

  pay(id: string, payment: IExpensePayment): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    if (!expense) return refuse('expense_not_found');
    if (expense.paymentState === 'paid') return refuse('expense_already_paid');
    const { id: _id, ...fields } = payment;
    Object.assign(expense, fields, { paymentState: 'paid', code: expense.code ?? nextCode(expense.siteId, payment.date), seasonLabel: 'Saison 2026-2027' });
    createNext(expense);
    return mockResolve(expense);
  }

  unpay(id: string): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    if (!expense) return refuse('expense_not_found');
    Object.assign(expense, { paymentState: 'to_pay', dueOn: expense.dueOn ?? expense.date, date: null, paidBy: null, paymentReference: '', seasonId: null, seasonLabel: null });
    return mockResolve(expense);
  }

  delete(id: string): Promise<void> {
    const index = EXPENSES_DB.findIndex((candidate) => candidate.id === id);
    if (index === -1) return refuse('expense_not_found');
    if (EXPENSES_DB[index].paymentState === 'paid') return refuse('expense_already_paid');
    const [removed] = EXPENSES_DB.splice(index, 1);
    createNext(removed);
    return mockResolve(undefined);
  }

  stopRecurrence(id: string): Promise<IExpense | null> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    if (!expense?.recurringExpenseId) return refuse('expense_not_recurring');
    const isGone = (other: IExpense): boolean => other.recurringExpenseId === expense.recurringExpenseId && isToPay(other) && (other.dueOn ?? '') > todayIso();
    EXPENSES_DB.filter((other) => other.recurringExpenseId === expense.recurringExpenseId).forEach((other) => Object.assign(other, { frequency: null }));
    const isRemoved = isGone(expense);
    EXPENSES_DB.splice(0, EXPENSES_DB.length, ...EXPENSES_DB.filter((other) => !isGone(other)));
    return mockResolve(isRemoved ? null : expense);
  }

  cancel(id: string, cancel: IExpenseCancel): Promise<IExpense> {
    const expense = EXPENSES_DB.find((candidate) => candidate.id === id);
    if (!expense) return refuse('expense_not_found');
    if (expense.status === 'cancelled') return mockResolve(expense);
    if (expense.paymentState === 'to_pay') return refuse('expense_not_paid');
    if (expense.isLocked) return refuse('season_closed');
    Object.assign(expense, { status: 'cancelled', cancelReason: cancel.reason.trim(), cancelledBy: cancel.by, cancelledAt: new Date().toISOString() });
    return mockResolve(expense);
  }
}
