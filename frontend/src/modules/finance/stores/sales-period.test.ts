import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FinanceMockService from 'finance/services/finance.mock';
import { useFinanceStore } from 'finance/stores/finance';
import { invalidateLoads } from 'global/composables/cached-load';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { IMovement, ISales } from 'finance/types/finance';

describe('the Finances figures', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    invalidateLoads();
    vi.restoreAllMocks();
  });

  it('follow the period every time, back and forth', async () => {
    vi.spyOn(FinanceMockService.prototype, 'getSales').mockImplementation((_, period) => Promise.resolve({ chartTitleKey: period } as unknown as ISales));
    const store = useFinanceStore();
    for (const period of ['season', 'today', 'season'] as const) await store.fetchSales(SITE_OUJDA_ID, period);
    expect(store.sales?.chartTitleKey).toBe('season');
  });

  it('show the Payments of the Site in view, back and forth', async () => {
    vi.spyOn(FinanceMockService.prototype, 'getMovements').mockImplementation((siteId) => Promise.resolve([{ id: siteId } as IMovement]));
    const store = useFinanceStore();
    for (const siteId of [SITE_OUJDA_ID, SITE_BERKANE_ID, SITE_OUJDA_ID]) await store.fetchMovements(siteId);
    expect([store.movements[0].id, store.loadedSiteId]).toEqual([SITE_OUJDA_ID, SITE_OUJDA_ID]);
  });
});
