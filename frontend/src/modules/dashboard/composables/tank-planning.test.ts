import { describe, expect, it } from 'vitest';

import { dayOffset, tankPlanning } from 'dashboard/composables/tank-planning';
import type { ILot } from 'lot/types/lot';

const storage = (fields: Partial<ILot['storages'][number]>): ILot['storages'][number] => ({ id: 's', tankId: 't1', litres: 400, withdrawnLitres: 0, from: '2026-11-05T12:00:00+01:00', plannedUntil: null, endedAt: null, by: 'H', ...fields });
const lot = (fields: Partial<ILot>): ILot => ({ id: 'l', code: 'L-1', siteId: 'oj', clientName: 'Ali', mode: 'service', variety: 'Picholine', storages: [], ...fields }) as ILot;

describe('tankPlanning', () => {
  const sites = [{ siteId: 'oj', siteName: 'Oujda', tanks: [{ id: 't1', number: 1, capacityLitres: 1000 }, { id: 't2', number: 2, capacityLitres: 500 }] }];
  const lots = [
    lot({ id: 'a', storages: [storage({ id: 's1', plannedUntil: '2026-11-20' })] }),
    lot({ id: 'b', code: 'L-2', mode: 'purchase', storages: [storage({ id: 's2', tankId: 't1', litres: 100, endedAt: '2026-11-07T09:00:00+01:00', withdrawnLitres: 100 })] }),
  ];

  it('fills each Tank from the oil still stored and names its variety, none when empty', () => {
    const { tanks } = tankPlanning(sites, lots, '2026-11-09', 'Huilerie');
    expect(tanks.map((tank) => [tank.name, tank.fillLitres, tank.variety])).toEqual([
      ['Cuve 1', 400, 'Picholine'],
      ['Cuve 2', 0, null],
    ]);
  });

  it('turns each Storage into days around today, the mill’s own oil under the mill’s name', () => {
    const { tankStorage } = tankPlanning(sites, lots, '2026-11-09', 'Huilerie');
    expect(tankStorage.map((entry) => [entry.client, entry.kind, entry.startDay, entry.endDay, entry.plannedEndDay])).toEqual([
      ['Ali', 'client', -4, null, 11],
      ['Huilerie', 'mill', -4, -2, null],
    ]);
    expect(dayOffset('2026-11-09T23:30:00+01:00', '2026-11-09')).toBe(0);
  });
});
