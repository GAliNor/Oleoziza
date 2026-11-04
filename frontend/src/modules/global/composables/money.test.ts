import { describe, expect, it } from 'vitest';

import { formatMoney, formatMoneyRounded } from 'global/composables/money';

const clean = (text: string): string => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it.each([
    [12852, '12 852 DH'],
    [7.2, '7,20 DH'],
    [2450.5, '2 450,50 DH'],
    [0, '0 DH'],
    [-12852, '−12 852 DH'],
    [-7.25, '−7,25 DH'],
    [1.005, '1 DH'],
    [19.999, '20 DH'],
  ])('shows %d as %s', (amount, expected) => {
    expect(clean(formatMoney(amount))).toBe(expected);
  });
});

describe('formatMoneyRounded', () => {
  it.each([
    [47231.5, '47 232 DH'],
    [-12851.6, '−12 852 DH'],
    [7.2, '7 DH'],
    [-0.4, '0 DH'],
  ])('shows %d as %s', (amount, expected) => {
    expect(clean(formatMoneyRounded(amount))).toBe(expected);
  });
});
