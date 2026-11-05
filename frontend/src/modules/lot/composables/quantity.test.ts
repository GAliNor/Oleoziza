import { describe, expect, it } from 'vitest';

import { formatKg, formatKgRounded, formatLitres, formatLitresRounded, formatOil, formatOliveKg, formatQuintals, formatYield, yieldPerQuintal } from 'lot/composables/quantity';

const clean = (text: string): string => text.replace(/\s/g, ' ');

describe('quantities', () => {
  it('shows kilograms to 100 g', () => {
    expect([formatKg(1840), formatKg(312.5), formatKg(312.54)].map(clean)).toEqual(['1 840 kg', '312,5 kg', '312,5 kg']);
  });

  it('rounds kilograms for tiles and charts', () => {
    expect(clean(formatKgRounded(77921.6))).toBe('77 922 kg');
  });

  it('shows quintals to one decimal', () => {
    expect(clean(formatQuintals(1840))).toBe('18,4 q');
  });

  it('shows litres to 0,1 L, and whole litres for tiles', () => {
    expect([formatLitres(425), formatLitres(9.75), formatLitresRounded(15252.4)].map(clean)).toEqual(['425 L', '9,8 L', '15 252 L']);
  });

  it('names what the quantities are', () => {
    expect([formatOliveKg(620), formatOil(154)].map(clean)).toEqual(['620 kg d’olives', '154 L d’huile']);
  });

  it('shows a yield in litres per quintal, with one decimal', () => {
    expect([yieldPerQuintal(425, 2000), clean(formatYield(425, 2050)), yieldPerQuintal(10, 0)]).toEqual([21.25, '20,7 L/q', 0]);
  });
});
