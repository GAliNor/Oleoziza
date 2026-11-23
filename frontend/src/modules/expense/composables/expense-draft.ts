import { createId } from 'global/composables/crypto';
import { todayIso } from 'global/composables/date';
import type { IExpense, IExpensePayload } from 'expense/types/expense';

export type ExpenseFormMode = 'new' | 'duplicate';

export const ICE_PATTERN = /^\d{15}$/;

const blankPayload = (siteId: string): IExpensePayload => ({
  id: createId(),
  siteId,
  paymentState: 'paid',
  dueOn: null,
  frequency: null,
  date: todayIso(),
  categoryId: '',
  description: '',
  amount: null,
  vatRate: null,
  supplierId: null,
  supplier: '',
  supplierIce: '',
  supplierIf: '',
  invoiceNumber: '',
  invoiceDate: null,
  paidBy: 'cash',
  paymentReference: '',
  documents: [],
});

/** What the form starts from: blank, or a copy of an Expense dated today with no documents and no recurrence. */
export const draftFrom = (siteId: string, mode: ExpenseFormMode, source: IExpense | null): IExpensePayload => {
  const blank = blankPayload(siteId);
  if (!source || mode === 'new') return blank;
  const { categoryId, description, amount, vatRate, supplierId, supplier, supplierIce, supplierIf, paidBy } = source;
  return { ...blank, siteId: source.siteId, categoryId, description, amount, vatRate, supplierId, supplier, supplierIce, supplierIf, paidBy: paidBy ?? 'cash' };
};

/** A draft kept on the device by an earlier version of the form may lack fields it did not have. */
export const completeDraft = (siteId: string, payload: IExpensePayload): IExpensePayload => ({ ...blankPayload(siteId), ...payload, amount: payload.amount || null });

/** An Expense as its page sends it back, with one property changed. */
export const payloadOf = (expense: IExpense, patch: Partial<IExpensePayload> = {}): IExpensePayload => {
  const { id, siteId, paymentState, dueOn, frequency, date, categoryId, description, amount, vatRate, supplierId, supplier, supplierIce, supplierIf, invoiceNumber, invoiceDate, paidBy, paymentReference, documents } = expense;
  return { id, siteId, paymentState, dueOn, frequency, date, categoryId, description, amount, vatRate, supplierId, supplier, supplierIce, supplierIf, invoiceNumber, invoiceDate, paidBy, paymentReference, documents: documents.map((document) => ({ ...document })), ...patch };
};
