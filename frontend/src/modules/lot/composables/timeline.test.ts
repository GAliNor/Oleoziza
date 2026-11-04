import { describe, expect, it } from 'vitest';

import { buildLotTimeline } from 'lot/composables/timeline';
import type { ILot } from 'lot/types/lot';

const clean = (text: string): string => text.replace(/\s/g, ' ');

const lot = (changes: Partial<ILot>): ILot =>
  ({ clientName: 'Said Tahiri', variety: 'Haouzia', netKg: 2050, oilKg: null, tankName: null, withdrawnKg: 0, receivedAt: '2026-11-04T07:45:00+01:00', receivedBy: 'Hamid', moves: [], stepPhotos: {}, boxNumbers: [], ...changes }) as ILot;

const move = (status: ILot['status']): ILot['moves'][number] => ({ status, at: '2026-11-04T12:00:00+01:00', by: 'Abdelkader' });

describe('buildLotTimeline', () => {
  it('starts every Lot with its Reception and Weighings', () => {
    const steps = buildLotTimeline(lot({}));
    expect(steps.map((step) => step.key)).toEqual(['reception', 'weighing']);
    expect(clean(steps[1].detail)).toBe('2 050 kg net (20,5 q)');
  });

  it('adds each move, and the Tank once the oil is stored', () => {
    const steps = buildLotTimeline(lot({ oilKg: 389, tankName: 'Cuve A2', moves: [move('waiting'), move('pressing'), move('pressed')] }));
    expect(steps.map((step) => step.key)).toEqual(['reception', 'weighing', 'waiting', 'pressing', 'pressed', 'stored']);
    expect(clean(steps[4].detail)).toBe('389 kg d’huile · rendement 19,0 %');
    expect(steps[5].detail).toBe('Cuve A2');
  });

  it('says which Box the olives wait in', () => {
    const steps = buildLotTimeline(lot({ boxNumbers: [7, 8], moves: [move('waiting')] }));
    expect(steps[2].detail).toBe('En file de pressage · Box 7, 8');
  });

  it('skips the Tank when the oil went straight to the Client', () => {
    expect(buildLotTimeline(lot({ oilKg: 389, moves: [move('pressed')] })).map((step) => step.key)).not.toContain('stored');
  });

  it('gives a step its photo, and leaves the others without', () => {
    const steps = buildLotTimeline(lot({ oilKg: 389, tankName: 'Cuve A2', moves: [move('pressed')], stepPhotos: { weighing: 'ticket.jpg', stored: 'tank.jpg' } }));
    expect(steps.map((step) => [step.key, step.imageUrl])).toEqual([
      ['reception', null],
      ['weighing', 'ticket.jpg'],
      ['pressed', null],
      ['stored', 'tank.jpg'],
    ]);
  });

  it('shows what left at the Withdrawal', () => {
    const steps = buildLotTimeline(lot({ oilKg: 389, withdrawnKg: 389, moves: [move('withdrawn')] }));
    expect(clean(steps[2].detail)).toBe('425 L · bidons de 20 L');
  });
});
