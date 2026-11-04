import { describe, expect, it } from 'vitest';

import { withPendingPayments } from 'finance/composables/sales-figures';
import type { IMovement, ISalesFigures } from 'finance/types/finance';

const BASE: ISalesFigures = { revenue: 1000, collected: 700, pending: 100, outstanding: 200, pendingCount: 3 };

const movement = (kind: IMovement['kind'], status: IMovement['status'], amount: number): IMovement => ({ kind, status, amount }) as IMovement;

describe('withPendingPayments', () => {
  it('counts only Payments still waiting', () => {
    const figures = withPendingPayments(BASE, [movement('payment', 'pending', 300), movement('payment', 'confirmed', 50), movement('payout', 'pending', 900)]);
    expect([figures.pending, figures.pendingCount]).toEqual([300, 1]);
  });

  it('keeps the four figures adding up to the CA', () => {
    const figures = withPendingPayments(BASE, [movement('payment', 'pending', 300)]);
    expect(figures.collected + figures.pending + figures.outstanding).toBe(figures.revenue);
  });

  it('never lets what is left to collect go past the CA', () => {
    const figures = withPendingPayments(BASE, [movement('payment', 'pending', 900)]);
    expect([figures.outstanding, figures.collected]).toEqual([100, 0]);
  });
});
