import { describe, expect, it } from 'vitest';

import { buildLotTimeline } from 'lot/composables/timeline';
import type { ILot } from 'lot/types/lot';

const clean = (text: string): string => text.replace(/\s/g, ' ');

const lot = (changes: Partial<ILot>): ILot =>
  ({ clientName: 'Said Tahiri', variety: 'Haouzia', netKg: 2050, oilLitres: null, tankName: null, withdrawnLitres: 0, receivedAt: '2026-11-04T07:45:00+01:00', receivedBy: 'Hamid', moves: [], stepPhotos: {}, boxNumbers: [], discount: null, notifications: [], ...changes }) as ILot;

const move = (status: ILot['status']): ILot['moves'][number] => ({ status, at: '2026-11-04T12:00:00+01:00', by: 'Abdelkader' });

describe('buildLotTimeline', () => {
  it('starts every Lot with its Reception, which carries the net weight', () => {
    const steps = buildLotTimeline(lot({}));
    expect(steps.map((step) => step.key)).toEqual(['reception']);
    expect(clean(steps[0].detail)).toBe('Said Tahiri · Haouzia · 2 050 kg net (20,5 q)');
  });

  it('adds each move, and the Tank once the oil is stored', () => {
    const steps = buildLotTimeline(lot({ oilLitres: 425, tankName: 'Cuve A2', moves: [move('waiting'), move('pressing'), move('pressed')] }));
    expect(steps.map((step) => step.key)).toEqual(['reception', 'waiting', 'pressing', 'pressed', 'stored']);
    expect(clean(steps[3].detail)).toBe('425 L d’huile · rendement 20,7 L/q');
    expect(steps[4].detail).toBe('Cuve A2');
  });

  it('says which Box the olives wait in', () => {
    const steps = buildLotTimeline(lot({ boxNumbers: [7, 8], moves: [move('waiting')] }));
    expect(steps[1].detail).toBe('En file de pressage · Box 7, 8');
  });

  it('skips the Tank when the oil went straight to the Client', () => {
    expect(buildLotTimeline(lot({ oilLitres: 425, moves: [move('pressed')] })).map((step) => step.key)).not.toContain('stored');
  });

  it('gives a step its photo, and leaves the others without', () => {
    const steps = buildLotTimeline(lot({ oilLitres: 425, tankName: 'Cuve A2', moves: [move('pressed')], stepPhotos: { reception: 'olives.jpg', stored: 'tank.jpg' } }));
    expect(steps.map((step) => [step.key, step.imageUrl])).toEqual([
      ['reception', 'olives.jpg'],
      ['pressed', null],
      ['stored', 'tank.jpg'],
    ]);
  });

  it('shows what left at the Withdrawal', () => {
    const steps = buildLotTimeline(lot({ oilLitres: 425, withdrawnLitres: 425, moves: [move('withdrawn')] }));
    expect(clean(steps[1].detail)).toBe('425 L · bidons de 20 L');
  });

  it('shows a Discount and its state just after the Reception', () => {
    const steps = buildLotTimeline(lot({ discount: { amountDh: 92, percent: 10, state: 'pending', givenBy: 'Hamid', givenAt: '2026-11-04T07:45:00+01:00' }, moves: [move('waiting')] }));
    expect(steps.map((step) => step.key)).toEqual(['reception', 'discount', 'waiting']);
    expect(clean(steps[1].detail)).toBe('92 DH (10 %), en attente d’approbation');
  });

  it('shows a sent notification, and one that could not go, after the pressing', () => {
    const notification = { event: 'pressed' as const, channel: 'sms' as const, at: '2026-11-04T12:30:00+01:00' };
    const steps = buildLotTimeline(lot({ oilLitres: 425, moves: [move('pressed')], notifications: [{ ...notification, isFailed: false }, { ...notification, isFailed: true }] }));
    expect(steps.map((step) => [step.key, step.label])).toEqual([['reception', 'Réception'], ['pressed', 'Pressé'], ['notification', 'Client prévenu'], ['notification', 'Notification impossible']]);
    expect(steps[2].detail).toBe('SMS : huile prête');
  });
});
