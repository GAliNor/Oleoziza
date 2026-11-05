import { describe, expect, it } from 'vitest';

import { readDiscount } from 'lot/composables/discount';

describe('a typed Discount', () => {
  it('reads a percentage as an amount too', () => {
    expect(readDiscount('percent', 10, 920, 10, false)).toEqual({ amountDh: 92, percent: 10, isOverLimit: false, isTooHigh: false });
  });

  it('reads an amount as a percentage, and checks the limit in %', () => {
    expect(readDiscount('amount', 138, 920, 10, false)).toEqual({ amountDh: 138, percent: 15, isOverLimit: true, isTooHigh: false });
  });

  it('needs approval for any Discount under a limit of 0 %', () => {
    expect(readDiscount('amount', 1, 920, 0, false).isOverLimit).toBe(true);
  });

  it('sets no limit for the Owner', () => {
    expect(readDiscount('percent', 50, 920, 10, true).isOverLimit).toBe(false);
  });

  it('refuses more than the fee', () => {
    expect(readDiscount('amount', 921, 920, 10, true).isTooHigh).toBe(true);
  });
});
