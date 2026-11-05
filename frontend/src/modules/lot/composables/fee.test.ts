import { describe, expect, it } from 'vitest';

import { amountDue, fullFee, isDiscountPending, millingFee, paymentStateOf } from 'lot/composables/fee';
import type { ILot, ILotDiscount } from 'lot/types/lot';

const lot = (state?: ILotDiscount['state']): Pick<ILot, 'netKg' | 'millingRatePerKg' | 'discount'> => ({
  netKg: 1840,
  millingRatePerKg: 0.5,
  discount: state ? { amountDh: 92, percent: 10, state, givenBy: 'Hamid', givenAt: '2026-11-05T10:00:00+01:00' } : null,
});

describe('the Milling Fee', () => {
  it('is the rate times the net weight', () => {
    expect([fullFee(lot()), millingFee(lot())]).toEqual([920, 920]);
  });

  it.each([['applied', 828], ['approved', 828], ['pending', 920], ['refused', 920]] as const)('with a Discount %s comes to %s', (state, expected) => {
    expect(millingFee(lot(state))).toBe(expected);
  });

  it('tells a pending Discount apart', () => {
    expect([isDiscountPending(lot('pending')), isDiscountPending(lot('applied')), isDiscountPending(lot())]).toEqual([true, false, false]);
  });

  it('keeps to the centime', () => {
    expect(fullFee({ netKg: 312.5, millingRatePerKg: 0.55 })).toBe(171.88);
  });
});

describe('the Payment State', () => {
  const paid = (paidDh: number, pendingDh: number) => ({ ...lot(), paidDh, pendingDh });

  it.each([
    [0, 0, 'unpaid', 920],
    [400, 0, 'partial', 520],
    [0, 400, 'partial', 520],
    [400, 520, 'to_confirm', 0],
    [0, 920, 'to_confirm', 0],
    [920, 0, 'paid', 0],
    [1000, 0, 'paid', 0],
  ] as const)('with %s DH confirmed and %s DH waiting is %s, %s DH left', (paidDh, pendingDh, state, due) => {
    expect([paymentStateOf(paid(paidDh, pendingDh)), amountDue(paid(paidDh, pendingDh))]).toEqual([state, due]);
  });

  it('takes a Credit Note off what is left', () => {
    expect([amountDue({ ...paid(0, 0), creditDh: 200 }), paymentStateOf({ ...paid(0, 0), creditDh: 200 }), paymentStateOf({ ...paid(0, 0), creditDh: 920 })]).toEqual([720, 'partial', 'paid']);
  });

  it('counts a fee lowered by a Discount', () => {
    expect(paymentStateOf({ ...lot('applied'), paidDh: 828, pendingDh: 0 })).toBe('paid');
  });
});
