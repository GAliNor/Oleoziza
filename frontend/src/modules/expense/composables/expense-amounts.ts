import { INVESTMENT_CATEGORY_ID } from 'expense/constants/expense-categories';
import type { IExpense, IExpenseCategory, IExpenseCategoryGroup, IExpenseSummary } from 'expense/types/expense';

const roundCentimes = (amount: number): number => Math.round(amount * 100) / 100;

/** The TVA inside an amount TTC; none without a rate. */
export const vatOf = (amountInclVat: number, vatRate: number | null): number => (vatRate ? roundCentimes((amountInclVat * vatRate) / (100 + vatRate)) : 0);

export const amountExclVat = (amountInclVat: number, vatRate: number | null): number => roundCentimes(amountInclVat - vatOf(amountInclVat, vatRate));

/** The category a sub-category files under; a category is its own. */
export const categoryIdOf = (categories: readonly IExpenseCategory[], categoryId: string): string => categories.find((item) => item.id === categoryId)?.parentId ?? categoryId;

/** Active categories in the owner's order, each with its active sub-categories. */
export const groupCategories = (categories: readonly IExpenseCategory[]): IExpenseCategoryGroup[] =>
  categories
    .filter((item) => item.type === 'category' && item.isActive)
    .sort((first, second) => first.position - second.position)
    .map((category) => ({
      category,
      subcategories: categories.filter((item) => item.parentId === category.id && item.isActive).sort((first, second) => first.position - second.position),
    }));

/** Totals of the recorded Expenses: Investments apart from the operating ones, and one line per category, largest first. */
export const summarizeExpenses = (expenses: readonly IExpense[], categories: readonly IExpenseCategory[]): IExpenseSummary => {
  const recorded = expenses.filter((expense) => expense.status === 'recorded');
  const byCategory = new Map<string, number>();
  recorded.forEach((expense) => {
    const categoryId = categoryIdOf(categories, expense.categoryId);
    byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + expense.amount);
  });
  const total = roundCentimes(recorded.reduce((sum, expense) => sum + expense.amount, 0));
  const investments = roundCentimes(byCategory.get(INVESTMENT_CATEGORY_ID) ?? 0);
  return {
    total,
    operating: roundCentimes(total - investments),
    investments,
    vat: roundCentimes(recorded.reduce((sum, expense) => sum + vatOf(expense.amount, expense.vatRate), 0)),
    count: recorded.length,
    byCategory: [...byCategory].map(([categoryId, amount]) => ({ categoryId, amount: roundCentimes(amount) })).sort((first, second) => second.amount - first.amount),
  };
};

/** What the Site earned: Revenue less every Expense but Investments. */
export const resultOf = (revenue: number, summary: IExpenseSummary): number => roundCentimes(revenue - summary.operating);
