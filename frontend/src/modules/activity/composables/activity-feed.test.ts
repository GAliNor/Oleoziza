import { describe, expect, it } from 'vitest';

import { buildActivityFeed, daySummary } from 'activity/composables/activity-feed';
import type { IMovement } from 'finance/types/finance';
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

const sources = { lots: [lot], movements: [cash, cheque], refunds: [], debtContacts: [], configurationChanges: [], clientNames: {} };

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
    expect(daySummary(buildActivityFeed(sources, DAY))).toEqual({ receptions: 1, receivedKg: 1000, storedLitres: 200, discounts: 1, discountDh: 50, collectedDh: 750 });
  });
});
