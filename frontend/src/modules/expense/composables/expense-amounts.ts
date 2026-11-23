import { INVESTMENT_CATEGORY_ID } from 'expense/constants/expense-categories';
import type { IExpense, IExpenseCategory, IExpenseCategoryGroup, IExpenseCategoryTotal, IExpenseSubcategoryTotal, IExpenseSummary, IExpenseToPay, IExpenseTypeGroup } from 'expense/types/expense';

const NOTHING_TO_PAY: IExpenseToPay = { count: 0, amount: 0, lateCount: 0, unknownAmountCount: 0 };

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

const byAmount = (first: IExpenseCategoryTotal, second: IExpenseCategoryTotal): number => second.amount - first.amount || first.categoryId.localeCompare(second.categoryId);

/** One total per sub-category with paid Expenses, largest first, as the backend summary returns them. */
export const totalBySubcategory = (expenses: readonly IExpense[], categories: readonly IExpenseCategory[]): IExpenseSubcategoryTotal[] => {
  const rows = new Map<string, IExpenseSubcategoryTotal>();
  expenses
    .filter((expense) => expense.status === 'recorded' && expense.paymentState === 'paid')
    .forEach((expense) => {
      const row = rows.get(expense.categoryId) ?? { categoryId: expense.categoryId, parentId: categoryIdOf(categories, expense.categoryId), amount: 0, vat: 0, count: 0 };
      rows.set(expense.categoryId, { ...row, amount: row.amount + (expense.amount ?? 0), vat: row.vat + vatOf(expense.amount ?? 0, expense.vatRate), count: row.count + 1 });
    });
  return [...rows.values()].map((row) => ({ ...row, amount: roundCentimes(row.amount), vat: roundCentimes(row.vat) })).sort(byAmount);
};

/** Totals of the recorded Expenses: Investments apart from the operating ones, one line per category and one per sub-category, largest first. */
export const summarizeExpenses = (expenses: readonly IExpense[], categories: readonly IExpenseCategory[], toPay: IExpenseToPay = NOTHING_TO_PAY): IExpenseSummary => {
  const bySubcategory = totalBySubcategory(expenses, categories);
  const byCategory = new Map<string, IExpenseCategoryTotal>();
  bySubcategory.forEach((row) => {
    const total = byCategory.get(row.parentId) ?? { categoryId: row.parentId, amount: 0, count: 0 };
    byCategory.set(row.parentId, { ...total, amount: roundCentimes(total.amount + row.amount), count: total.count + row.count });
  });
  const total = roundCentimes(bySubcategory.reduce((sum, row) => sum + row.amount, 0));
  const investments = byCategory.get(INVESTMENT_CATEGORY_ID)?.amount ?? 0;
  return {
    toPay,
    total,
    operating: roundCentimes(total - investments),
    investments,
    vat: roundCentimes(bySubcategory.reduce((sum, row) => sum + row.vat, 0)),
    count: bySubcategory.reduce((sum, row) => sum + row.count, 0),
    byCategory: [...byCategory.values()].sort(byAmount),
    bySubcategory,
  };
};

/** The « Par type » view: each category with spending and its sub-categories, largest first, Investments last since they stay out of the Result; `focusId` keeps one category. */
export const groupByType = (summary: IExpenseSummary, focusId: string | null = null): IExpenseTypeGroup[] =>
  summary.byCategory
    .filter((total) => !focusId || total.categoryId === focusId)
    .map((total) => ({ ...total, rows: summary.bySubcategory.filter((row) => row.parentId === total.categoryId) }))
    .sort((first, second) => Number(first.categoryId === INVESTMENT_CATEGORY_ID) - Number(second.categoryId === INVESTMENT_CATEGORY_ID));

/** What the Site earned: Revenue less every Expense but Investments. */
export const resultOf = (revenue: number, summary: IExpenseSummary): number => roundCentimes(revenue - summary.operating);
