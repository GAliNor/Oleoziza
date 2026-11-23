import { categoryIdOf } from 'expense/composables/expense-amounts';
import { CASH_DAILY_LIMIT } from 'expense/constants/expense';
import { CASH_LIMIT_EXEMPT_IDS, INVESTMENT_CATEGORY_ID } from 'expense/constants/expense-categories';
import type { ExpenseWarning, IExpenseCategory, IExpensePayload } from 'expense/types/expense';

type IWarnedFields = Pick<IExpensePayload, 'categoryId' | 'amount' | 'vatRate' | 'paidBy' | 'invoiceNumber' | 'supplierIce'>;

/** What the accountant will flag on this Expense: cash beyond the CGI limits, or TVA that can't be claimed back. Warnings only: the money is already spent. */
export const expenseWarnings = (expense: IWarnedFields, categories: readonly IExpenseCategory[]): ExpenseWarning[] => {
  const subcategory = categories.find((item) => item.id === expense.categoryId);
  const categoryId = categoryIdOf(categories, expense.categoryId);
  const isCashExempt = CASH_LIMIT_EXEMPT_IDS.includes(categoryId) || CASH_LIMIT_EXEMPT_IDS.includes(expense.categoryId);
  const hasVat = Boolean(expense.vatRate);
  const warnings: ExpenseWarning[] = [];
  if (expense.paidBy === 'cash' && categoryId === INVESTMENT_CATEGORY_ID) warnings.push('investment_in_cash');
  else if (expense.paidBy === 'cash' && !isCashExempt && (expense.amount ?? 0) > CASH_DAILY_LIMIT) warnings.push('cash_over_daily_limit');
  if (hasVat && !expense.invoiceNumber.trim()) warnings.push('vat_without_invoice');
  if (hasVat && !expense.supplierIce.trim()) warnings.push('vat_without_ice');
  if (hasVat && subcategory?.isVatNeverDeductible) warnings.push('vat_never_deductible');
  return warnings;
};
