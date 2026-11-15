import { createId } from 'global/composables/crypto';
import { todayIso } from 'global/composables/date';
import type { IExpense, IExpensePayload } from 'expense/types/expense';

export type ExpenseFormMode = 'new' | 'edit' | 'duplicate';

const ICE_PATTERN = /^\d{15}$/;

/** What the form starts from: blank, the Expense being changed, or a copy of it dated today with no documents. */
export const draftFrom = (siteId: string, mode: ExpenseFormMode, source: IExpense | null): IExpensePayload => {
  if (!source || mode === 'new') {
    return { id: createId(), siteId, date: todayIso(), categoryId: '', description: '', amount: 0, vatRate: null, supplierId: null, supplier: '', supplierIce: '', supplierIf: '', invoiceNumber: '', invoiceDate: null, paidBy: 'cash', paymentReference: '', documents: [] };
  }
  const { id, siteId: sourceSiteId, date, categoryId, description, amount, vatRate, supplierId, supplier, supplierIce, supplierIf, invoiceNumber, invoiceDate, paidBy, paymentReference, documents } = source;
  const fields = { siteId: sourceSiteId, categoryId, description, amount, vatRate, supplierId, supplier, supplierIce, supplierIf, paidBy };
  if (mode === 'edit') return { ...fields, id, date, invoiceNumber, invoiceDate, paymentReference, documents: documents.map((document) => ({ ...document })) };
  return { ...fields, id: createId(), date: todayIso(), invoiceNumber: '', invoiceDate: null, paymentReference: '', documents: [] };
};

/** The checks the form makes before sending; the server makes them again. */
export const draftProblem = (draft: IExpensePayload): 'required' | 'iceInvalid' | null => {
  if (!draft.date || !draft.categoryId || !draft.description.trim() || !(draft.amount > 0) || !draft.supplier.trim()) return 'required';
  if (draft.supplierIce && !ICE_PATTERN.test(draft.supplierIce)) return 'iceInvalid';
  return null;
};
