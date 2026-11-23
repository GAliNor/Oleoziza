import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ExpenseMockService from 'expense/services/expense.mock';
import { useExpenseStore } from 'expense/stores/expense';
import { invalidateLoads } from 'global/composables/cached-load';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { IExpenseSummary } from 'expense/types/expense';

const summaryOf = (count: number): IExpenseSummary => ({ operating: count, investments: 0, vat: 0, count, byCategory: [], bySubcategory: [] }) as unknown as IExpenseSummary;

describe('the totals of the Charges page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    invalidateLoads();
    vi.restoreAllMocks();
  });

  it('follow the period every time, back and forth, not only on the first click', async () => {
    vi.spyOn(ExpenseMockService.prototype, 'getSummary').mockImplementation((_, period) => Promise.resolve(summaryOf(period === 'season' ? 9 : 0)));
    const store = useExpenseStore();
    const shown: (number | undefined)[] = [];
    for (const period of ['season', 'today', 'season', 'today', 'season'] as const) {
      await store.fetchSummary(SITE_OUJDA_ID, period);
      shown.push(store.summary?.count);
    }
    expect(shown).toEqual([9, 0, 9, 0, 9]);
  });

  it('follow the Site every time', async () => {
    vi.spyOn(ExpenseMockService.prototype, 'getSummary').mockImplementation((siteId) => Promise.resolve(summaryOf(siteId === SITE_OUJDA_ID ? 9 : 2)));
    const store = useExpenseStore();
    for (const siteId of [SITE_OUJDA_ID, SITE_BERKANE_ID, SITE_OUJDA_ID]) await store.fetchSummary(siteId, 'week');
    expect(store.summary?.count).toBe(9);
  });

  it('keep the period asked last when an earlier answer arrives late', async () => {
    let answerLate: (summary: IExpenseSummary) => void = () => undefined;
    vi.spyOn(ExpenseMockService.prototype, 'getSummary').mockImplementation((_, period) => (period === 'season' ? new Promise((resolve) => (answerLate = resolve)) : Promise.resolve(summaryOf(1))));
    const store = useExpenseStore();
    const late = store.fetchSummary(SITE_OUJDA_ID, 'season');
    await store.fetchSummary(SITE_OUJDA_ID, 'today');
    answerLate(summaryOf(9));
    await late;
    expect(store.summary?.count).toBe(1);
  });
});
