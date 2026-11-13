import { describe, expect, it } from 'vitest';

import { firstStart, lineQueue, lotsAhead, pressingOn, suggestLine, suggestStart } from 'lot/composables/press-schedule';
import type { ILot } from 'lot/types/lot';

const lot = (id: string, fields: Partial<ILot>): ILot => ({ id, status: 'waiting', pressLineId: 'l1', plannedStartAt: null, ...fields }) as ILot;
const LINES = [
  { id: 'l1', number: 1, name: '' },
  { id: 'l2', number: 2, name: '' },
];

describe('press scheduling', () => {
  const lots = [
    lot('a', { plannedStartAt: '2026-11-09T14:00:00.000Z' }),
    lot('b', { status: 'pressing', plannedStartAt: '2026-11-09T09:00:00.000Z' }),
    lot('c', { plannedStartAt: '2026-11-09T12:00:00.000Z' }),
    lot('d', { pressLineId: 'l2', plannedStartAt: '2026-11-09T10:00:00.000Z' }),
    lot('e', { status: 'pressed', plannedStartAt: '2026-11-09T08:00:00.000Z' }),
  ];

  it('orders a Line queue: the Lot pressing first, then by planned start', () => {
    expect(lineQueue(lots, 'l1').map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(lotsAhead(lots, lots[0])).toBe(2);
  });

  it('suggests the Line with the shortest queue', () => {
    expect(suggestLine(LINES, lots)?.id).toBe('l2');
    expect(suggestLine(LINES, [])?.id).toBe('l1');
  });

  it('suggests the whole hour after the last planned start, or after now', () => {
    expect(suggestStart(lots, 'l1', new Date('2026-11-09T08:20:00.000Z'))).toBe('2026-11-09T15:00:00.000Z');
    expect(suggestStart([], 'l1', new Date('2026-11-09T08:20:00.000Z'))).toBe('2026-11-09T09:00:00.000Z');
  });

  it('puts a VIP Lot ahead of every Lot waiting on its Line, never later than now', () => {
    expect(firstStart(lots, 'l1', 'a', new Date('2026-11-09T10:30:20.000Z'))).toBe('2026-11-09T10:30:00.000Z');
    expect(firstStart(lots, 'l1', 'a', new Date('2026-11-09T13:00:00.000Z'))).toBe('2026-11-09T11:59:00.000Z');
    expect(firstStart(lots, 'l2', 'd', new Date('2026-11-09T13:00:00.000Z'))).toBe('2026-11-09T13:00:00.000Z');
  });

  it('knows which Lot a Line is pressing', () => {
    expect(pressingOn(lots, 'l1')?.id).toBe('b');
    expect(pressingOn(lots, 'l1', 'b')).toBeUndefined();
  });
});
