import { describe, expect, it } from 'vitest';

import { allocatePayment } from 'finance/composables/allocate-payment';
import type { ILot } from 'lot/types/lot';

const lot = (code: string, netKg: number, receivedAt: string, paidDh = 0): ILot => ({ id: code, code, netKg, millingRatePerKg: 0.5, discount: null, paidDh, pendingDh: 0, receivedAt }) as ILot;

const OLD = lot('OLD', 1000, '2026-11-01');
const NEW = lot('NEW', 2000, '2026-11-03');

describe('allocatePayment', () => {
  it('pays every ticked Lot when the amount is their total', () => {
    expect(allocatePayment([NEW, OLD], 1500).map((link) => [link.lotCode, link.amount])).toEqual([['OLD', 500], ['NEW', 1000]]);
  });

  it('covers the oldest first when the amount is lower, the last one reached partly', () => {
    expect(allocatePayment([NEW, OLD], 700).map((link) => [link.lotCode, link.amount])).toEqual([['OLD', 500], ['NEW', 200]]);
  });

  it('leaves out a Lot the amount does not reach', () => {
    expect(allocatePayment([NEW, OLD], 300).map((link) => link.lotCode)).toEqual(['OLD']);
  });

  it('counts only what is still due', () => {
    expect(allocatePayment([lot('PART', 1000, '2026-11-01', 400)], 100)[0].amount).toBe(100);
    expect(allocatePayment([lot('PART', 1000, '2026-11-01', 400)], 500)[0].amount).toBe(100);
  });
});
