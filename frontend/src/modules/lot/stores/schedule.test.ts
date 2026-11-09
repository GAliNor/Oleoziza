import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLotStore } from 'lot/stores/lot';
import { createId } from 'global/composables/crypto';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ILot } from 'lot/types/lot';

describe('scheduling a Lot on a Press Line', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    await useLotStore().fetchLots(SITE_OUJDA_ID, true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives every waiting seed Lot a Line and a planned start', () => {
    const waiting = useLotStore().lots.filter((lot) => lot.status === 'waiting');
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.every((lot) => lot.pressLineId && lot.plannedStartAt)).toBe(true);
  });

  it('moves a waiting Lot to another Line and time', async () => {
    const lot = useLotStore().lots.find((item) => item.status === 'waiting') as ILot;
    const updated = await useLotStore().scheduleLot(lot, { id: createId(), pressLineId: 'oj-line-2', plannedStartAt: '2026-11-10T08:00:00.000Z' });
    expect([updated?.pressLineId, updated?.plannedStartAt]).toEqual(['oj-line-2', '2026-11-10T08:00:00.000Z']);
  });

  it('no longer moves a Lot once its Pressing has started', async () => {
    const lot = useLotStore().lots.find((item) => item.status === 'pressed') as ILot;
    expect(await useLotStore().scheduleLot(lot, { id: createId(), pressLineId: 'oj-line-2', plannedStartAt: '2026-11-10T08:00:00.000Z' })).toBeNull();
  });
});
