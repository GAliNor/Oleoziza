import { i18n } from '~/plugins/i18n';

import type { IExpense } from 'expense/types/expense';

/** What an Expense is called: its description, else its Supplier, else its type. */
export const expenseTitle = (expense: Pick<IExpense, 'description' | 'supplier' | 'categoryId'>): string =>
  expense.description.trim() || expense.supplier.trim() || (expense.categoryId ? i18n.global.t(`expense.categories.${expense.categoryId}`) : i18n.global.t('expense.draft.untitled'));
