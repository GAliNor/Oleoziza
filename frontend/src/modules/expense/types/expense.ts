import type { IPaymentDocument } from 'finance/types/finance';
import type { IPageList } from 'global/types/page';
import type { IPeriodRange, PeriodKey } from 'global/types/period';

export type ExpenseCategoryType = 'category' | 'subcategory';

/** How the TVA return files a cost: a fixed asset, a good, a service, or outside TVA. */
export type ExpenseVatNature = 'fixed_asset' | 'good' | 'service' | 'none';

/** One row of the seeded Expense Category list; its slug is its id and its label key. */
export interface IExpenseCategory {
  id: string;
  type: ExpenseCategoryType;
  parentId: string | null;
  position: number;
  isActive: boolean;
  /** Suggested CGNC account for the accountant's export; empty when the accountant decides. */
  accountCode: string | null;
  vatNature: ExpenseVatNature;
  isVatNeverDeductible: boolean;
}

/** A category with the sub-categories an Expense can point at. */
export interface IExpenseCategoryGroup {
  category: IExpenseCategory;
  subcategories: IExpenseCategory[];
}

export type ExpensePaidBy = 'cash' | 'cheque' | 'transfer' | 'card';

export type ExpenseStatus = 'recorded' | 'cancelled';

/** Only paid ones count in totals, TVA and the export. */
export type ExpensePaymentState = 'to_pay' | 'paid';

export type ExpenseFrequency = 'monthly' | 'quarterly' | 'yearly';

export type IExpenseDocument = IPaymentDocument;

export interface IExpense {
  id: string;
  /** The « N° pièce », given when it is paid. */
  code: string | null;
  siteId: string;
  /** The Season its payment counts in; null until it is paid. */
  seasonId: string | null;
  seasonLabel: string | null;
  /** Its Season was closed after its payment: nothing changes any more. */
  isLocked: boolean;
  paymentState: ExpensePaymentState;
  dueOn: string | null;
  recurringExpenseId: string | null;
  /** How often it comes back; null once stopped. */
  frequency: ExpenseFrequency | null;
  /** Payment date. */
  date: string | null;
  categoryId: string;
  description: string;
  amount: number | null;
  vatRate: number | null;
  supplierId: string | null;
  supplier: string;
  supplierIce: string;
  supplierIf: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  paidBy: ExpensePaidBy | null;
  paymentReference: string;
  documents: IExpenseDocument[];
  status: ExpenseStatus;
  recordedBy: string;
  recordedAt: string;
  updatedBy?: string;
  updatedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

/** What the entry form sends; the id is drawn when the form opens, so a retry is the same Expense. */
export interface IExpensePayload {
  id: string;
  siteId: string;
  paymentState: ExpensePaymentState;
  dueOn: string | null;
  frequency: ExpenseFrequency | null;
  date: string | null;
  categoryId: string;
  description: string;
  amount: number | null;
  vatRate: number | null;
  supplierId: string | null;
  supplier: string;
  supplierIce: string;
  supplierIf: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  paidBy: ExpensePaidBy | null;
  paymentReference: string;
  documents: IExpenseDocument[];
}

/** An Expense marked paid; the id is minted when the panel opens, so a retry never pays twice. */
export interface IExpensePayment {
  id: string;
  date: string;
  amount: number;
  paidBy: ExpensePaidBy;
  paymentReference: string;
}

export type ExpenseWarning = 'cash_over_daily_limit' | 'investment_in_cash' | 'vat_without_invoice' | 'vat_without_ice' | 'vat_never_deductible';

/** Someone the mill pays, shared by every Site, with the tax ids its invoices carry. */
export interface ISupplier {
  id: string;
  name: string;
  ice: string;
  taxId: string;
}

export interface IExpenseCancel {
  reason: string;
  by: string;
}

export interface IExpenseListQuery {
  siteId: string;
  period: PeriodKey;
  /** A category (all its sub-categories) or one sub-category. */
  categoryId: string | null;
  search: string;
  /** Paid in the period, or all that is still to pay. */
  paymentState: ExpensePaymentState;
}

export interface IExpenseCategoryTotal {
  categoryId: string;
  amount: number;
  count: number;
}

/** The period's total for one sub-category (« Salaires », « Électricité »), with its category. */
export interface IExpenseSubcategoryTotal extends IExpenseCategoryTotal {
  parentId: string;
  vat: number;
}

/** One category of the « Par type » view: its total and its sub-categories with spending. */
export interface IExpenseTypeGroup extends IExpenseCategoryTotal {
  rows: IExpenseSubcategoryTotal[];
}

export type ExpenseView = 'type' | 'due' | 'list';

/** What is still to pay, whatever the period. */
export interface IExpenseToPay {
  count: number;
  amount: number;
  lateCount: number;
  unknownAmountCount: number;
}

/** The period's paid Expenses, cancelled ones left out, and what is still to pay. */
export interface IExpenseSummary {
  toPay: IExpenseToPay;
  total: number;
  operating: number;
  investments: number;
  vat: number;
  count: number;
  byCategory: IExpenseCategoryTotal[];
  bySubcategory: IExpenseSubcategoryTotal[];
}

export interface IExpenseService {
  getCategories(): Promise<IExpenseCategory[]>;
  getPage(query: IExpenseListQuery, page: { offset: number; limit: number }): Promise<{ items: IExpense[]; total: number }>;
  getOne(id: string): Promise<IExpense>;
  getSummary(siteId: string, period: PeriodKey): Promise<IExpenseSummary>;
  getSuppliers(): Promise<ISupplier[]>;
  createSupplier(supplier: ISupplier): Promise<ISupplier>;
  getForExport(siteId: string, range: IPeriodRange): Promise<IExpense[]>;
  create(payload: IExpensePayload & { recordedBy: string }): Promise<IExpense>;
  update(id: string, payload: IExpensePayload & { updatedBy: string }): Promise<IExpense>;
  cancel(id: string, cancel: IExpenseCancel): Promise<IExpense>;
  pay(id: string, payment: IExpensePayment): Promise<IExpense>;
  unpay(id: string, actionId: string): Promise<IExpense>;
  delete(id: string): Promise<void>;
  /** Null when the occurrence it was stopped from is the one removed. */
  stopRecurrence(id: string, actionId: string): Promise<IExpense | null>;
}

export interface IExpenseStore {
  categories: IExpenseCategory[];
  list: IPageList<IExpense, IExpenseListQuery>;
  current: IExpense | null;
  isCurrentLoading: boolean;
  summary: IExpenseSummary | null;
  summaryQuery: { siteId: string; period: PeriodKey } | null;
  suppliers: ISupplier[];
  isCategoriesLoading: boolean;
  isSuppliersLoading: boolean;
  isSupplierSaving: boolean;
  isSummaryLoading: boolean;
  hasSummaryError: boolean;
  isSaving: boolean;
  saveErrorCode: string | null;
  isExporting: boolean;
}
