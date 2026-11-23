import { describe, expect, it } from 'vitest';

import { buildActivityFeed, daySummary, filterFeed } from 'activity/composables/activity-feed';
import type { IMovement } from 'finance/types/finance';
import type { IExpense } from 'expense/types/expense';
import type { ILot } from 'lot/types/lot';

const DAY = '2026-11-09';
const at = (time: string, day = DAY): string => `${day}T${time}:00+01:00`;

const lot = {
  id: 'l1',
  code: 'OJ-1',
  clientName: 'Ali',
  variety: 'Haouzia',
  netKg: 1000,
  oilLitres: 200,
  withdrawnLitres: 0,
  receivedAt: at('08:00'),
  receivedBy: 'Hamid',
  moves: [
    { status: 'waiting', at: at('08:00'), by: 'Hamid' },
    { status: 'pressing', at: at('10:00'), by: 'Abdelkader' },
    { status: 'pressed', at: at('11:00'), by: 'Abdelkader' },
  ],
  storages: [{ id: 's1', tankId: 't1', litres: 200, withdrawnLitres: 0, from: at('11:00'), plannedUntil: null, endedAt: null, by: 'Abdelkader' }],
  discount: { amountDh: 50, percent: 10, state: 'applied', givenBy: 'Khadija', givenAt: at('12:00') },
} as unknown as ILot;

const cash = { id: 'm1', code: 'P-1', client: 'Ali', method: 'cash', amount: 450, status: 'confirmed', recordedAt: at('12:05'), recordedBy: 'Khadija', decidedAt: at('12:05'), decidedBy: 'Khadija' } as IMovement;
const cheque = { id: 'm2', code: 'P-2', client: 'Sara', method: 'cheque', amount: 300, status: 'confirmed', recordedAt: at('09:00', '2026-11-08'), recordedBy: 'Khadija', decidedAt: at('15:00'), decidedBy: 'Khadija' } as IMovement;

const sources = { lots: [lot], movements: [cash, cheque], refunds: [], expenses: [], debtContacts: [], configurationChanges: [], clientNames: {}, tankNumbers: { t1: 1 } };

describe('buildActivityFeed', () => {
  it('tells the day newest first, from every record, and only that day', () => {
    const feed = buildActivityFeed(sources, DAY);
    expect(feed.map((event) => event.kind)).toEqual(['payment_confirmed', 'payment_confirmed', 'discount_given', 'pressed', 'stored', 'pressing', 'reception']);
    expect(feed.find((event) => event.id === 'recorded-m2')).toBeUndefined();
  });

  it('marks money events so they can be hidden from those who may not see finances', () => {
    const feed = buildActivityFeed(sources, DAY);
    expect(feed.filter((event) => event.isMoney).map((event) => event.group)).toEqual(['payment', 'payment', 'discount']);
  });

  it('sums up what came in, what was stored, given off and collected', () => {
    expect(daySummary(buildActivityFeed(sources, DAY))).toMatchObject({ receptions: 1, receivedKg: 1000, storedLitres: 200, discounts: 1, discountDh: 50, collectedDh: 750 });
  });

  it('counts the day per group and lists who acted, so the list can load a page at a time', () => {
    const feed = buildActivityFeed(sources, DAY);
    const summary = daySummary(filterFeed(feed, { group: null, person: null, includeMoney: false }));
    expect([summary.total, summary.groupCounts.payment, summary.groupCounts.production, summary.people]).toEqual([feed.length - 3, 0, 3, ['Abdelkader', 'Hamid']]);
  });

  it('keeps only the group, the person and the Money events a filter asks for', () => {
    const feed = buildActivityFeed(sources, DAY);
    expect(filterFeed(feed, { group: 'payment', person: 'Khadija', includeMoney: true }).every((event) => event.group === 'payment' && event.by === 'Khadija')).toBe(true);
    expect(filterFeed(feed, { group: 'payment', person: null, includeMoney: false })).toEqual([]);
  });

  it('tells an Expense entered then cancelled as two finance-only events linking to the Charges page', () => {
    const expense = { id: 'e1', code: 'OJ-C2627-0009', siteId: 's', date: DAY, categoryId: 'electricity', description: 'Électricité', amount: 1200, paymentState: 'paid', status: 'cancelled', recordedAt: at('09:30'), recordedBy: 'Nadia', cancelledAt: at('16:00'), cancelledBy: 'Mohammed', cancelReason: 'Saisie en double' } as IExpense;
    const feed = buildActivityFeed({ ...sources, lots: [], movements: [], expenses: [expense] }, DAY);
    expect(feed.map((event) => event.kind)).toEqual(['expense_cancelled', 'expense_recorded']);
    expect(feed.every((event) => event.group === 'expense' && event.isMoney && event.amount === 1200)).toBe(true);
    expect(feed[0].to).toEqual({ name: 'expense', query: { period: 'season', expense: 'e1' } });
    expect(filterFeed(feed, { group: null, person: null, includeMoney: false })).toEqual([]);
  });
});
