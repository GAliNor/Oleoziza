import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { amountDue, millingFee } from 'lot/composables/fee';
import { createId } from 'global/composables/crypto';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ILot } from 'lot/types/lot';

describe('giving a Discount at the counter', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    useSessionStore().setSession({ userId: 'k', sid: 's', role: 'accountant', isOwner: false, sites: {}, firstName: 'Khadija', lastName: 'Amrani', expiresAt: 0 });
    await useLotStore().fetchLots(SITE_OUJDA_ID, true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const unpaidLots = (): ILot[] => useLotStore().lots.filter((lot) => !lot.discount && lot.mode === 'service' && amountDue(lot) > 50);

  it('lowers the fee at once within the limit, and records who gave it', async () => {
    const [lot] = unpaidLots();
    const before = millingFee(lot);
    const updated = await useLotStore().giveDiscount(lot, { id: createId(), amountDh: 20, percent: 2, isOverLimit: false });
    expect(updated?.discount).toMatchObject({ state: 'applied', givenBy: 'Khadija Amrani' });
    expect(millingFee(updated as ILot)).toBe(before - 20);
  });

  it('keeps the full fee while a Discount over the limit waits for approval', async () => {
    const [, lot] = unpaidLots();
    const before = millingFee(lot);
    const updated = await useLotStore().giveDiscount(lot, { id: createId(), amountDh: 30, percent: 40, isOverLimit: true });
    expect(updated?.discount?.state).toBe('pending');
    expect(millingFee(updated as ILot)).toBe(before);
  });

  it('refuses a second Discount and one larger than what is left to pay', async () => {
    const [, , lot, other] = unpaidLots();
    await useLotStore().giveDiscount(lot, { id: createId(), amountDh: 10, percent: 1, isOverLimit: false });
    expect(await useLotStore().giveDiscount(useLotStore().lots.find((item) => item.id === lot.id) as ILot, { id: createId(), amountDh: 5, percent: 1, isOverLimit: false })).toBeNull();
    expect(await useLotStore().giveDiscount(other, { id: createId(), amountDh: amountDue(other) + 1, percent: 100, isOverLimit: false })).toBeNull();
  });
});
