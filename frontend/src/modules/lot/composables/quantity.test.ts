import { describe, expect, it } from 'vitest';

import { formatKg, formatKgRounded, formatLitres, formatOilKg, formatOliveKg, formatQuintals, formatYield, toLitres } from 'lot/composables/quantity';

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

  it('converts oil to whole litres through the density', () => {
    expect([toLitres(916), clean(formatLitres(13971))]).toEqual([1000, '15 252 L']);
  });

  it('names what the kilograms are', () => {
    expect([formatOliveKg(620), formatOilKg(141)].map(clean)).toEqual(['620 kg d’olives', '141 kg d’huile']);
  });

  it('shows a yield with one decimal', () => {
    expect(clean(formatYield(389, 2050))).toBe('19,0 %');
  });
});
