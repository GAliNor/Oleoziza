import { useSiteStore } from 'site/stores/site';
import type { IExpense } from 'expense/types/expense';

/** What a confirmation repeats: the Season a paid Expense counts in, and its Site. */
export const useExpenseScope = (): { scopeOf: (expense: Pick<IExpense, 'seasonLabel' | 'siteId'>) => string } => {
  const siteStore = useSiteStore();

  const scopeOf = (expense: Pick<IExpense, 'seasonLabel' | 'siteId'>): string => [expense.seasonLabel, siteStore.sites.find((site) => site.id === expense.siteId)?.name].filter(Boolean).join(' · ');

  return { scopeOf };
};
