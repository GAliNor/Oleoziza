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

export type IExpenseDocument = IPaymentDocument;

export interface IExpense {
  id: string;
  code: string | null;
  siteId: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  vatRate: number | null;
  supplierId: string | null;
  supplier: string;
  supplierIce: string;
  supplierIf: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  paidBy: ExpensePaidBy;
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
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  vatRate: number | null;
  supplierId: string | null;
  supplier: string;
  supplierIce: string;
  supplierIf: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  paidBy: ExpensePaidBy;
  paymentReference: string;
  documents: IExpenseDocument[];
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
}

export interface IExpenseCategoryTotal {
  categoryId: string;
  amount: number;
}

/** The period's Expenses, cancelled ones left out. */
export interface IExpenseSummary {
  total: number;
  operating: number;
  investments: number;
  vat: number;
  count: number;
  byCategory: IExpenseCategoryTotal[];
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
  isExporting: boolean;
}
