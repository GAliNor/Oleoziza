import { describe, expect, it } from 'vitest';

import { clientsToCollect } from 'finance/composables/cash-desk';
import type { ILot } from 'lot/types/lot';

const lot = (fields: Partial<ILot>): ILot =>
  ({
    id: 'lot',
    clientId: 'c1',
    clientName: 'Client',
    mode: 'service',
    netKg: 1000,
    millingRatePerKg: 0.5,
    discount: null,
    paidDh: 0,
    pendingDh: 0,
    creditDh: 0,
    receivedAt: '2026-11-09T08:00:00+01:00',
    moves: [],
    ...fields,
  }) as ILot;

describe('clientsToCollect', () => {
  it('sums what each Client owes and puts the latest activity first', () => {
    const rows = clientsToCollect([
      lot({ id: 'a', clientId: 'c1', clientName: 'Ali' }),
      lot({ id: 'b', clientId: 'c1', clientName: 'Ali', paidDh: 100 }),
      lot({ id: 'c', clientId: 'c2', clientName: 'Sara', moves: [{ status: 'pressed', at: '2026-11-09T12:00:00+01:00', by: 'Hamid' }] }),
    ]);
    expect(rows.map((row) => row.clientName)).toEqual(['Sara', 'Ali']);
    expect(rows[1]).toMatchObject({ dueDh: 900, lotCount: 2 });
  });

  it('leaves out paid Lots but keeps one waiting for a Discount decision', () => {
    const rows = clientsToCollect([
      lot({ id: 'a', paidDh: 500 }),
      lot({ id: 'b', clientId: 'c2', discount: { amountDh: 100, percent: 20, state: 'pending', givenBy: 'K', givenAt: '' }, pendingDh: 500 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ clientId: 'c2', hasPendingDiscount: true, dueDh: 0 });
  });

  it('leaves out purchased olives, which owe no Milling Fee', () => {
    expect(clientsToCollect([lot({ mode: 'purchase' })])).toEqual([]);
  });
});
