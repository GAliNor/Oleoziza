import { describe, expect, it } from 'vitest';

import { areSideBySide, boxesNeeded, boxOccupancy, formatBoxes, suggestBoxes } from 'lot/composables/lot-boxes';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { SETTINGS_MOCK } from 'reception/constants/mock-reception';
import type { ILot } from 'lot/types/lot';

const lot = (status: ILot['status'], boxNumbers: number[], siteId = 'oujda'): ILot => ({ status, boxNumbers, siteId }) as ILot;

describe('boxesNeeded', () => {
  it('rounds up to whole Boxes', () => {
    expect([boxesNeeded(1000, 1000), boxesNeeded(1000.1, 1000), boxesNeeded(1840, 1000)]).toEqual([1, 2, 2]);
  });

  it('needs none before a weight is typed', () => {
    expect(boxesNeeded(0, 1000)).toBe(0);
  });
});

describe('boxOccupancy', () => {
  it('holds a Box until pressing starts', () => {
    const occupancy = boxOccupancy([lot('waiting', [2, 3]), lot('pressing', [4]), lot('pressed', [5]), lot('withdrawn', [6])], 'oujda');
    expect([...occupancy.keys()]).toEqual([2, 3]);
  });

  it('keeps each Site’s Boxes apart', () => {
    expect(boxOccupancy([lot('waiting', [1], 'berkane')], 'oujda').size).toBe(0);
  });
});

describe('suggestBoxes', () => {
  it('takes the smallest gap that fits, keeping the long ones open', () => {
    expect(suggestBoxes([1, 2, 3, 4, 7, 8, 11], 2)).toEqual([7, 8]);
  });

  it('takes the lowest gap when several are the same size', () => {
    expect(suggestBoxes([3, 4, 8, 9], 2)).toEqual([3, 4]);
  });

  it('falls back on separate Boxes when no gap fits', () => {
    expect(suggestBoxes([2, 5, 9], 2)).toEqual([2, 5]);
  });

  it('gives what is left when there are too few', () => {
    expect(suggestBoxes([5], 3)).toEqual([5]);
  });

  it('suggests nothing without a need, and sorts what it is given', () => {
    expect([suggestBoxes([1, 2], 0), suggestBoxes([9, 8, 2], 2)]).toEqual([[], [8, 9]]);
  });
});

describe('areSideBySide', () => {
  it('tells consecutive numbers from the others', () => {
    expect([areSideBySide([7, 8, 9]), areSideBySide([7, 9]), areSideBySide([7])]).toEqual([true, false, true]);
  });
});

describe('formatBoxes', () => {
  it('names one or several Boxes', () => {
    expect([formatBoxes([7]), formatBoxes([7, 8])]).toEqual(['Box 7', 'Box 7, 8']);
  });
});

describe('the mock Lots', () => {
  it.each(Object.entries(SETTINGS_MOCK))('leave Boxes free on Site %s, each held by one Lot, with room for every Lot', (siteId, settings) => {
    const holding = LOTS_MOCK.filter((item) => item.siteId === siteId && item.status === 'waiting');
    const held = holding.flatMap((item) => item.boxNumbers);
    holding.forEach((item) => expect(item.boxNumbers.length).toBeGreaterThan(0));
    expect(new Set(held).size).toBe(held.length);
    expect(Math.max(...held)).toBeLessThanOrEqual(settings.boxCount);
    expect(held.length).toBeLessThan(settings.boxCount);
  });
});
