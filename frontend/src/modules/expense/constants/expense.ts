import type { ExpenseFrequency, ExpensePaidBy } from 'expense/types/expense';

export const EXPENSE_ROUTE_NAME = 'expense';

/** Where an Expense being typed is kept, per person and Site, so a reload or a crash doesn't lose it. */
export const EXPENSE_DRAFT_STORAGE_KEY = 'oleoziza.expense-draft.v1';

export const EXPENSE_PAID_BY: readonly ExpensePaidBy[] = ['cash', 'cheque', 'transfer', 'card'];

/** The 2026 TVA rates (CGI art. 99: only 20 % and 10 % remain), and 0 for an exempt purchase; no rate means outside TVA. */
export const VAT_RATES: readonly number[] = [20, 10, 0];

/** Cash paid to one supplier above this, in a day, makes its TVA and part of the cost non-deductible (CGI art. 106-II, 11-II). */
export const CASH_DAILY_LIMIT = 5000;

/** One earthy color per category, in the palette's order, for the breakdown on the Dashboard and the Charges page. */
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  staff: 'var(--color-primary-olive-dark)',
  energy: 'var(--color-accent-gold)',
  maintenance: 'var(--color-primary-olive-mid)',
  premises: 'var(--color-accent-sand)',
  transport: 'var(--color-accent-rust)',
  administration: 'var(--color-neutral-500)',
  compliance: 'var(--color-primary-olive-light)',
  commercial: 'var(--color-info-blue)',
  miscellaneous: 'var(--color-neutral-300)',
  stock_purchase: 'var(--color-accent-brown)',
  investment: 'var(--color-neutral-700)',
};

export const EXPENSE_FREQUENCIES: readonly ExpenseFrequency[] = ['monthly', 'quarterly', 'yearly'];

/** Key of « Sans TVA » among the rates. */
export const NO_VAT = 'none';
