import { describe, expect, it } from 'vitest';

import { debtRows, matchesDebtFilter } from 'finance/composables/debt-follow-up';
import type { IDebtContact } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

const lot = (fields: Partial<ILot>): ILot =>
  ({ id: 'lot', clientId: 'c1', clientName: 'Ali', mode: 'service', netKg: 1000, millingRatePerKg: 0.5, discount: null, paidDh: 0, pendingDh: 0, creditDh: 0, receivedAt: '2026-11-01T08:00:00+01:00', moves: [], ...fields }) as ILot;

const contact = (fields: Partial<IDebtContact>): IDebtContact => ({ id: 'x', siteId: 's', clientId: 'c1', kind: 'call', note: '', promisedOn: null, by: 'K', at: '2026-11-05T10:00:00+01:00', ...fields });

describe('debtRows', () => {
  it('puts the oldest debt first and leaves out what a recorded Payment covers', () => {
    const rows = debtRows(
      [lot({ id: 'a', clientId: 'c1', receivedAt: '2026-11-03T08:00:00+01:00' }), lot({ id: 'b', clientId: 'c2', clientName: 'Sara' }), lot({ id: 'c', clientId: 'c3', pendingDh: 500 })],
      [],
      '2026-11-09',
    );
    expect(rows.map((row) => row.clientId)).toEqual(['c2', 'c1']);
    expect(rows[0].dueDh).toBe(500);
  });

  it('keeps the latest promised date and flags it once passed', () => {
    const contacts = [contact({ id: '1', promisedOn: '2026-11-07', at: '2026-11-04T10:00:00+01:00' }), contact({ id: '2', kind: 'note', at: '2026-11-08T10:00:00+01:00' })];
    const [row] = debtRows([lot({})], contacts, '2026-11-09');
    expect([row.promisedOn, row.isPromiseOverdue, row.contacts[0].id]).toEqual(['2026-11-07', true, '2']);
    expect(matchesDebtFilter(row, 'overdue')).toBe(true);
    expect(matchesDebtFilter(row, 'untouched')).toBe(false);
  });
});
