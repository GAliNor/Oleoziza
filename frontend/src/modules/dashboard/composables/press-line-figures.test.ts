import { describe, expect, it } from 'vitest';

import { pressLineFigures } from 'dashboard/composables/press-line-figures';
import type { ILot } from 'lot/types/lot';

const lot = (fields: Partial<ILot>): ILot => ({ id: 'l', siteId: 'oj', netKg: 1000, oilLitres: 180, pressLineId: 'p1', moves: [], ...fields }) as ILot;
const pressedLot = (id: string, line: string, start: string, end: string): ILot =>
  lot({ id, pressLineId: line, moves: [{ status: 'pressing', at: start, by: 'H' }, { status: 'pressed', at: end, by: 'H' }] });

describe('pressLineFigures', () => {
  const sites = [{ siteId: 'oj', siteName: 'Oujda', pressLines: [{ id: 'p1', number: 1, name: '' }, { id: 'p2', number: 2, name: 'Sinolea' }] }];
  const label = (line: { number: number; name: string }): string => (line.name ? `Chaîne ${line.number} · ${line.name}` : `Chaîne ${line.number}`);

  it('adds up the Lots pressed in the period on each Press Line, with the hours spent pressing', () => {
    const lots = [
      pressedLot('a', 'p1', '2026-11-10T08:00:00+01:00', '2026-11-10T09:30:00+01:00'),
      pressedLot('b', 'p1', '2026-11-11T10:00:00+01:00', '2026-11-11T11:00:00+01:00'),
      pressedLot('c', 'p2', '2026-11-01T10:00:00+01:00', '2026-11-01T11:00:00+01:00'),
      lot({ id: 'd', pressLineId: 'p2', oilLitres: null, moves: [{ status: 'pressing', at: '2026-11-11T10:00:00+01:00', by: 'H' }] }),
    ];
    expect(pressLineFigures(sites, lots, '2026-11-07', '2026-11-13', label).map((row) => [row.name, row.lots, row.olivesKg, row.oilLitres, row.pressingHours])).toEqual([
      ['Chaîne 1', 2, 2000, 360, 2.5],
      ['Chaîne 2 · Sinolea', 0, 0, 0, 0],
    ]);
  });

  it('names each Press Line after its Site when several Sites are in scope', () => {
    const twoSites = [...sites, { siteId: 'bk', siteName: 'Berkane', pressLines: [{ id: 'p3', number: 1, name: '' }] }];
    expect(pressLineFigures(twoSites, [], '2026-11-07', '2026-11-13', label).map((row) => row.name)).toEqual(['Oujda · Chaîne 1', 'Oujda · Chaîne 2 · Sinolea', 'Berkane · Chaîne 1']);
  });
});
