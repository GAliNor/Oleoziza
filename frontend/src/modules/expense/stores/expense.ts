import { defineStore } from 'pinia';

import ExpenseService from 'expense/services/expense';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import { cachedLoad, invalidateLoads, LOAD_TTL_MS, slotLoad } from 'global/composables/cached-load';
import { emptyPageList, loadPage, replaceOnPage } from 'global/composables/paged-list';
import { groupCategories } from 'expense/composables/expense-amounts';
import type { IExpense, IExpenseCategoryGroup, IExpenseListQuery, IExpensePayload, IExpensePayment, IExpenseStore, ISupplier } from 'expense/types/expense';
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
    saveErrorCode: null,
    isExporting: false,
  }),
  getters: {
    groups: (state): IExpenseCategoryGroup[] => groupCategories(state.categories),
  },
  actions: {
    async fetchCategories(): Promise<void> {
      await withStatus(this, 'isCategoriesLoading', () =>
        cachedLoad('expense-categories', LOAD_TTL_MS.reference, async () => {
          this.categories = await expenseService.getCategories();
        }),
      );
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
      await withStatus(
        this,
        'isSummaryLoading',
        () =>
          slotLoad(
            'expense-summary',
            `${siteId}:${period}`,
            LOAD_TTL_MS.records,
            () => expenseService.getSummary(siteId, period),
            (summary) => {
              this.summary = summary;
            },
          ),
        { errorFlag: 'hasSummaryError' },
      );
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
      invalidateLoads('expense-summary:');
      invalidateLoads('tasks:');
      await Promise.all([this.list.query ? this.fetchPage(this.list.query, this.list.page, true) : Promise.resolve(), this.summaryQuery ? this.fetchSummary(this.summaryQuery.siteId, this.summaryQuery.period) : Promise.resolve()]);
    },
    async create(payload: IExpensePayload): Promise<IExpense | null> {
      const expense = await this.run(() => expenseService.create({ ...plainPayload(payload), recordedBy: useSessionStore().fullName }));
      if (!expense) return null;
      this.current = expense;
      await this.refresh();
      return expense;
    },
    update(id: string, payload: IExpensePayload): Promise<IExpense | null> {
      return this.change(() => expenseService.update(id, { ...plainPayload(payload), updatedBy: useSessionStore().fullName }));
    },
    cancel(expense: IExpense, reason: string): Promise<IExpense | null> {
      return this.change(() => expenseService.cancel(expense.id, { reason, by: useSessionStore().fullName }));
    },
    pay(id: string, payment: IExpensePayment): Promise<IExpense | null> {
      return this.change(() => expenseService.pay(id, { ...payment }));
    },
    unpay(id: string, actionId: string): Promise<IExpense | null> {
      return this.change(() => expenseService.unpay(id, actionId));
    },
    /** Only while it is to pay: no money moved. */
    async delete(id: string): Promise<boolean> {
      const isDeleted = await this.run(async () => {
        await expenseService.delete(id);
        return true;
      });
      if (!isDeleted) return false;
      if (this.current?.id === id) this.current = null;
      await this.refresh();
      return true;
    },
    /** True once stopped; the occurrence it was stopped from may be the one removed. */
    async stopRecurrence(id: string, actionId: string): Promise<boolean> {
      const answer = await this.run(async () => ({ expense: await expenseService.stopRecurrence(id, actionId) }));
      if (!answer) return false;
      if (answer.expense) this.replaceExpense(answer.expense);
      else if (this.current?.id === id) this.current = null;
      await this.refresh();
      return true;
    },
    /** Puts the answer in place, then reads the page and the totals it changed. */
    async change(task: () => Promise<IExpense>): Promise<IExpense | null> {
      const expense = await this.run(task);
      if (!expense) return null;
      this.replaceExpense(expense);
      await this.refresh();
      return expense;
    },
    /** Keeps why a change was refused, for the form or the property to say. */
    run<T>(task: () => Promise<T>): Promise<T | null> {
      return withStatus(this, 'isSaving', task, { errorCode: 'saveErrorCode' });
    },
  },
});
