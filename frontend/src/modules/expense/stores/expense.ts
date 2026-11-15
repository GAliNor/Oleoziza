import { defineStore } from 'pinia';

import ExpenseService from 'expense/services/expense';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import { emptyPageList, loadPage, replaceOnPage } from 'global/composables/paged-list';
import { groupCategories } from 'expense/composables/expense-amounts';
import type { IExpense, IExpenseCategoryGroup, IExpenseListQuery, IExpensePayload, IExpenseStore, ISupplier } from 'expense/types/expense';
import type { IPeriodRange, PeriodKey } from 'global/types/period';

const expenseService = new ExpenseService();

/** Copies what a form holds, so no reactive proxy leaves the store. */
const plainPayload = (payload: IExpensePayload): IExpensePayload => ({ ...payload, documents: payload.documents.map((document) => ({ ...document })) });

/** The Expense Categories, the register of the current Site and its period summary. */
export const useExpenseStore = defineStore('expense', {
  state: (): IExpenseStore => ({
    categories: [],
    list: emptyPageList<IExpense, IExpenseListQuery>(),
    current: null,
    isCurrentLoading: false,
    summary: null,
    summaryQuery: null,
    suppliers: [],
    isCategoriesLoading: false,
    isSuppliersLoading: false,
    isSupplierSaving: false,
    isSummaryLoading: false,
    hasSummaryError: false,
    isSaving: false,
    isExporting: false,
  }),
  getters: {
    groups: (state): IExpenseCategoryGroup[] => groupCategories(state.categories),
  },
  actions: {
    async fetchCategories(): Promise<void> {
      if (this.categories.length) return;
      const categories = await withStatus(this, 'isCategoriesLoading', () => expenseService.getCategories());
      if (categories) this.categories = categories;
    },
    /** One numbered page of the register, read from the server only when it is asked for. */
    fetchPage(query: IExpenseListQuery, page: number, isForced = false): Promise<void> {
      return loadPage(this.list, query, page, (listQuery, slice) => expenseService.getPage(listQuery, slice), isForced);
    },
    /** An Expense opened by its id, when the page shown doesn't hold it (a link from the Journal, a reload). */
    async fetchOne(id: string): Promise<void> {
      if (this.current?.id === id) return;
      const expense = await withStatus(this, 'isCurrentLoading', () => expenseService.getOne(id));
      if (expense) this.current = expense;
    },
    replaceExpense(expense: IExpense): void {
      replaceOnPage(this.list, expense);
      this.current = expense;
    },
    async fetchSummary(siteId: string, period: PeriodKey): Promise<void> {
      this.summaryQuery = { siteId, period };
      const summary = await withStatus(this, 'isSummaryLoading', () => expenseService.getSummary(siteId, period), { errorFlag: 'hasSummaryError' });
      if (summary && this.summaryQuery?.siteId === siteId && this.summaryQuery.period === period) this.summary = summary;
    },
    async fetchSuppliers(isForced = false): Promise<void> {
      if (this.suppliers.length && !isForced) return;
      const suppliers = await withStatus(this, 'isSuppliersLoading', () => expenseService.getSuppliers());
      if (suppliers) this.suppliers = suppliers;
    },
    /** A Supplier created from inside the Expense form, so the Expense being typed carries on. */
    async createSupplier(supplier: ISupplier): Promise<ISupplier | null> {
      const created = await withStatus(this, 'isSupplierSaving', () => expenseService.createSupplier({ ...supplier }));
      if (created && !this.suppliers.some((item) => item.id === created.id)) this.suppliers = [...this.suppliers, created].sort((first, second) => first.name.localeCompare(second.name));
      return created;
    },
    fetchForExport(siteId: string, range: IPeriodRange): Promise<IExpense[] | null> {
      return withStatus(this, 'isExporting', () => expenseService.getForExport(siteId, range));
    },
    /** The rows and totals again, after an Expense was added, changed or cancelled. */
    async refresh(): Promise<void> {
      await Promise.all([this.list.query ? this.fetchPage(this.list.query, this.list.page, true) : Promise.resolve(), this.summaryQuery ? this.fetchSummary(this.summaryQuery.siteId, this.summaryQuery.period) : Promise.resolve()]);
    },
    async create(payload: IExpensePayload): Promise<IExpense | null> {
      const expense = await withStatus(this, 'isSaving', () => expenseService.create({ ...plainPayload(payload), recordedBy: useSessionStore().fullName }));
      if (!expense) return null;
      this.current = expense;
      await this.refresh();
      return expense;
    },
    async update(id: string, payload: IExpensePayload): Promise<IExpense | null> {
      const expense = await withStatus(this, 'isSaving', () => expenseService.update(id, { ...plainPayload(payload), updatedBy: useSessionStore().fullName }));
      if (!expense) return null;
      this.replaceExpense(expense);
      await this.refresh();
      return expense;
    },
    async cancel(expense: IExpense, reason: string): Promise<IExpense | null> {
      const cancelled = await withStatus(this, 'isSaving', () => expenseService.cancel(expense.id, { reason, by: useSessionStore().fullName }));
      if (!cancelled) return null;
      this.replaceExpense(cancelled);
      await this.refresh();
      return cancelled;
    },
  },
});
