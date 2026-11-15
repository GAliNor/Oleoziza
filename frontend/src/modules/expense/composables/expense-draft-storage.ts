import { readStorage, writeStorage } from 'global/composables/storage';
import { EXPENSE_DRAFT_STORAGE_KEY } from 'expense/constants/expense';
import type { ExpenseFormMode } from 'expense/composables/expense-draft';
import type { IExpensePayload } from 'expense/types/expense';

/** An Expense form left unsaved: what was typed, from which Expense, and when. */
export interface IExpenseDraft {
  mode: ExpenseFormMode;
  sourceId: string | null;
  payload: IExpensePayload;
  savedAt: string;
  /** The browser had no room for the documents: they must be added again. */
  hasDroppedDocuments: boolean;
}

const keyOf = (userId: string, siteId: string): string => `${EXPENSE_DRAFT_STORAGE_KEY}:${userId}:${siteId}`;

const isDraft = (value: unknown): value is IExpenseDraft => Boolean(value && typeof value === 'object' && 'payload' in value && (value as IExpenseDraft).payload?.id);

/** Whether anything was typed yet: an untouched form leaves no draft behind. */
export const isWorthKeeping = (payload: IExpensePayload): boolean =>
  Boolean(payload.description.trim() || payload.amount > 0 || payload.categoryId || payload.supplier.trim() || payload.invoiceNumber.trim() || payload.documents.length);

export const readExpenseDraft = (userId: string, siteId: string): IExpenseDraft | null => {
  const value = readStorage<unknown>(keyOf(userId, siteId), null);
  return isDraft(value) ? value : null;
};

/** Keeps the draft; when the documents don't fit, keeps it without them and says so. */
export const saveExpenseDraft = (userId: string, siteId: string, draft: Omit<IExpenseDraft, 'savedAt' | 'hasDroppedDocuments'>): IExpenseDraft | null => {
  const stored: IExpenseDraft = { ...draft, savedAt: new Date().toISOString(), hasDroppedDocuments: false };
  if (writeStorage(keyOf(userId, siteId), stored)) return stored;
  const lighter: IExpenseDraft = { ...stored, payload: { ...stored.payload, documents: [] }, hasDroppedDocuments: stored.payload.documents.length > 0 };
  return writeStorage(keyOf(userId, siteId), lighter) ? lighter : null;
};

export const clearExpenseDraft = (userId: string, siteId: string): void => {
  writeStorage(keyOf(userId, siteId), null);
};
