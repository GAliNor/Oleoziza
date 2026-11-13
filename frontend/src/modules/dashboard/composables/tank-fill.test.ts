import { describe, expect, it } from 'vitest';

import { tankFill } from 'dashboard/composables/tank-fill';
import type { ILot } from 'lot/types/lot';

const storage = (fields: Partial<ILot['storages'][number]>): ILot['storages'][number] => ({ id: 's', tankId: 't1', litres: 400, withdrawnLitres: 0, from: '2026-11-05T12:00:00+01:00', plannedUntil: null, endedAt: null, by: 'H', ...fields });
const lot = (fields: Partial<ILot>): ILot => ({ id: 'l', code: 'L-1', siteId: 'oj', clientName: 'Ali', mode: 'service', variety: 'Picholine', storages: [], ...fields }) as ILot;

describe('tankFill', () => {
  const sites = [{ siteId: 'oj', siteName: 'Oujda', tanks: [{ id: 't1', number: 1, capacityLitres: 1000 }, { id: 't2', number: 2, capacityLitres: 500 }] }];
  const lots = [
    lot({ id: 'a', storages: [storage({ id: 's1', plannedUntil: '2026-11-20' })] }),
    lot({ id: 'b', code: 'L-2', mode: 'purchase', storages: [storage({ id: 's2', tankId: 't1', litres: 100, endedAt: '2026-11-07T09:00:00+01:00', withdrawnLitres: 100 })] }),
  ];

  it('fills each Tank from the oil still stored and names its variety, none when empty', () => {
    expect(tankFill(sites, lots).map((tank) => [tank.name, tank.fillLitres, tank.variety])).toEqual([
      ['Cuve 1', 400, 'Picholine'],
      ['Cuve 2', 0, null],
    ]);
  });

  it('names each Tank after its Site when several Sites are in scope', () => {
    const twoSites = [...sites, { siteId: 'bk', siteName: 'Berkane', tanks: [{ id: 't3', number: 1, capacityLitres: 800 }] }];
    expect(tankFill(twoSites, lots).map((tank) => tank.name)).toEqual(['Oujda · Cuve 1', 'Oujda · Cuve 2', 'Berkane · Cuve 1']);
  });
});
