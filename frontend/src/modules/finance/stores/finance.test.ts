import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFinanceStore } from 'finance/stores/finance';
import { salesMock } from 'finance/constants/mock-sales';
import { MOVEMENTS_MOCK } from 'finance/constants/mock-movements';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { ALL_SITES } from 'site/constants/site';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { IMovement, MovementStatus } from 'finance/types/finance';

describe('finance store decisions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await useFinanceStore().fetchMovements(ALL_SITES, true);
  });

  const movementWith = (status: MovementStatus, kind: IMovement['kind'] = 'payment'): IMovement => {
    const found = useFinanceStore().movements.find((item) => item.status === status && item.kind === kind);
    if (!found) throw new Error(`no ${status} ${kind} in the mock`);
    return found;
  };

  it('confirms a pending Payment and records who did it', async () => {
    const updated = await useFinanceStore().decide(movementWith('pending'), { status: 'confirmed' });
    expect(updated?.status).toBe('confirmed');
    expect(updated?.decidedAt).toBeTruthy();
    expect(useFinanceStore().movements.find((item) => item.id === updated?.id)?.status).toBe('confirmed');
  });

  it('confirming twice changes nothing the second time', async () => {
    const movement = movementWith('pending');
    const first = await useFinanceStore().decide(movement, { status: 'confirmed' });
    const second = await useFinanceStore().decide(movement, { status: 'confirmed' });
    expect(second?.decidedAt).toBe(first?.decidedAt);
  });

  it('keeps the reason of a rejection', async () => {
    const updated = await useFinanceStore().decide(movementWith('pending'), { status: 'rejected', note: 'Absent de la caisse' });
    expect([updated?.status, updated?.note]).toEqual(['rejected', 'Absent de la caisse']);
  });

  it('cancels a confirmed Payment as a Credit Note', async () => {
    const updated = await useFinanceStore().decide(movementWith('confirmed'), { status: 'cancelled', note: 'Chèque impayé', settlement: 'credit_note' });
    expect([updated?.status, updated?.settlement]).toEqual(['cancelled', 'credit_note']);
  });

  it('refuses to cancel a Payment still pending', async () => {
    expect(await useFinanceStore().decide(movementWith('pending'), { status: 'cancelled', note: 'x', settlement: 'refund' })).toBeNull();
  });
});

describe('the mock sales', () => {
  it('keep the four figures adding up to the CA', () => {
    const { figures } = salesMock(SITE_OUJDA_ID, 'month');
    expect(figures.collected + figures.pending + figures.outstanding).toBeCloseTo(figures.revenue);
  });

  it('give each Site a share of all Sites', () => {
    const all = salesMock(ALL_SITES, 'season').figures.revenue;
    const sum = salesMock(SITE_OUJDA_ID, 'season').figures.revenue + salesMock(SITE_BERKANE_ID, 'season').figures.revenue;
    expect(sum).toBeCloseTo(all);
  });
});

describe('finance mock movements', () => {
  it('links every movement to a real Client, so the client tag always opens a page', () => {
    const clientIds = new Set(CLIENTS_MOCK.map((client) => client.id));
    expect(MOVEMENTS_MOCK.filter((movement) => !clientIds.has(movement.clientId))).toEqual([]);
  });

  it('names the bank account on every transfer and cheque', () => {
    const banked = MOVEMENTS_MOCK.filter((movement) => movement.method === 'transfer' || movement.method === 'cheque');
    expect(banked.filter((movement) => !movement.bankAccount)).toEqual([]);
  });
});
