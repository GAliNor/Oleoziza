import { describe, expect, it } from 'vitest';

import { clientHistory, matchesHistoryQuery, seasonOf } from 'client/composables/client-history';
import type { IClientLotLine } from 'client/types/client';
import type { ILot } from 'lot/types/lot';

const lot = (code: string, receivedAt: string, clientId = 'c1'): ILot =>
  ({ id: code, code, clientId, receivedAt, variety: 'Haouzia', netKg: 1000, oilLitres: null, withdrawnLitres: 0, status: 'waiting', millingRatePerKg: 0.5, discount: null, paidDh: 0, pendingDh: 0, creditDh: 0 }) as ILot;

const line = (code: string, receivedOn: string): IClientLotLine => ({ code, siteId: 's', siteName: 's', status: 'withdrawn', kg: 800, oilLitres: 150, millingRatePerKg: 0.5, variety: 'Menara', season: seasonOf(receivedOn), receivedOn });

describe('the Client history', () => {
  it('names a Season from October to September', () => {
    expect([seasonOf('2026-10-01'), seasonOf('2027-02-14'), seasonOf('2026-09-30')]).toEqual(['2627', '2627', '2526']);
  });

  it('puts the live Lots and the past ones together, newest first, without a Lot twice', () => {
    const rows = clientHistory([lot('OJ-2627-0158', '2026-11-05T10:00:00+01:00'), lot('OTHER', '2026-11-05T10:00:00+01:00', 'c2')], [line('OJ-2526-0040', '2026-01-10'), line('OJ-2627-0158', '2026-11-05')], 'c1');
    expect(rows.map((row) => [row.code, row.paymentState, row.lot !== null])).toEqual([['OJ-2627-0158', 'unpaid', true], ['OJ-2526-0040', 'paid', false]]);
  });

  it('finds a Lot by its number or its day', () => {
    const [row] = clientHistory([], [line('OJ-2526-0040', '2026-01-10')], 'c1');
    expect(['0040', '10/01', '10/1', '10/01/2026', '11/01', 'BK'].map((query) => matchesHistoryQuery(row, query))).toEqual([true, true, true, true, false, false]);
  });
});
