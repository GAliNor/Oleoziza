import { describe, expect, it } from 'vitest';

import { canTake, checkPours, suggestPours, tankStates } from 'lot/composables/storage';
import type { ILot } from 'lot/types/lot';

const TANKS = [
  { id: 't1', number: 1, capacityLitres: 1000 },
  { id: 't2', number: 2, capacityLitres: 500 },
  { id: 't3', number: 3, capacityLitres: 2000 },
];

const stored = (id: string, variety: string, tankId: string, litres: number, fields: Partial<ILot['storages'][number]> = {}): ILot =>
  ({ id, variety, mode: 'service', storages: [{ id: `s-${id}`, tankId, litres, withdrawnLitres: 0, from: '2026-11-01', plannedUntil: null, endedAt: null, by: 'H', ...fields }] }) as ILot;

describe('Tanks and Storages', () => {
  const lots = [stored('a', 'Picholine', 't1', 800), stored('b', 'Haouzia', 't2', 300, { endedAt: '2026-11-05' })];
  const states = tankStates(TANKS, lots);

  it('reads a Tank variety from the oil still in it, and frees an emptied one', () => {
    expect(states.map((state) => [state.variety, state.fillLitres, state.freeLitres])).toEqual([
      ['Picholine', 800, 200],
      [null, 0, 500],
      [null, 0, 2000],
    ]);
    expect([canTake(states[0], 'Haouzia'), canTake(states[0], 'Picholine'), canTake(states[1], 'Haouzia')]).toEqual([false, true, true]);
  });

  it('fills the Tank of the same variety first, then the smallest empty one that fits the rest', () => {
    expect(suggestPours(states, 'Picholine', 600)).toEqual([
      { tankId: 't1', litres: 200 },
      { tankId: 't2', litres: 400 },
    ]);
    expect(suggestPours(states, 'Menara', 300)).toEqual([{ tankId: 't2', litres: 300 }]);
  });

  it('refuses another variety, too much oil, a split that loses litres, and purchased oil handed over', () => {
    const lot = { variety: 'Haouzia', mode: 'service' as const };
    expect(checkPours(states, lot, 300, 0, [{ tankId: 't1', litres: 300 }])).toBe('variety');
    expect(checkPours(states, lot, 900, 0, [{ tankId: 't2', litres: 900 }])).toBe('space');
    expect(checkPours(states, lot, 300, 50, [{ tankId: 't2', litres: 200 }])).toBe('total');
    expect(checkPours(states, { ...lot, mode: 'purchase' }, 300, 300, [])).toBe('purchaseHandedOver');
    expect(checkPours(states, lot, 300, 100, [{ tankId: 't2', litres: 200 }])).toBeNull();
  });
});
