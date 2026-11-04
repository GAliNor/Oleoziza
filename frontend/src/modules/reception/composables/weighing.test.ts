import { describe, expect, it } from 'vitest';

import { createWeighingDraft, draftNetKg, isDraftValid, isTareOverGross, tareKg, weighedContainers } from 'reception/composables/weighing';
import type { ILot, IWeighing } from 'lot/types/lot';
import type { ISiteReceptionSettings, IWeighingDraft } from 'reception/types/reception';

const SETTINGS: ISiteReceptionSettings = { containerTareKg: { sac: 0.6, caisse: 2 }, dailyPricePerKg: null };

const grossDraft = (grossKg: number | null, sac = 0, caisse = 0): IWeighingDraft => ({
  ...createWeighingDraft('gross'),
  grossKg,
  containers: { sac, caisse },
});

const netDraft = (netKgTyped: number | null): IWeighingDraft => ({ ...createWeighingDraft('net'), netKgTyped });

describe('tareKg', () => {
  it('adds each container kind at its Site tare', () => {
    expect(tareKg({ sac: 10, caisse: 3 }, SETTINGS)).toBeCloseTo(12);
  });

  it('is zero before the settings load', () => {
    expect(tareKg({ sac: 10, caisse: 3 }, null)).toBe(0);
  });
});

describe('draftNetKg', () => {
  it('subtracts the tare from the gross weight, rounded to 100 g', () => {
    expect(draftNetKg(grossDraft(500.04, 7), SETTINGS)).toBe(495.8);
  });

  it('never goes below zero', () => {
    expect(draftNetKg(grossDraft(4, 10), SETTINGS)).toBe(0);
  });

  it('takes a typed net weight as is', () => {
    expect(draftNetKg(netDraft(312.5), SETTINGS)).toBe(312.5);
  });
});

describe('isDraftValid and isTareOverGross', () => {
  it('accepts a gross weight above the tare', () => {
    expect([isDraftValid(grossDraft(100, 10), SETTINGS), isTareOverGross(grossDraft(100, 10), SETTINGS)]).toEqual([true, false]);
  });

  it('flags a tare that reaches the gross weight', () => {
    expect([isDraftValid(grossDraft(6, 10), SETTINGS), isTareOverGross(grossDraft(6, 10), SETTINGS)]).toEqual([false, true]);
  });

  it('does not flag an empty gross weight', () => {
    expect([isDraftValid(grossDraft(null, 10), SETTINGS), isTareOverGross(grossDraft(null, 10), SETTINGS)]).toEqual([false, false]);
  });

  it('needs a positive typed net weight', () => {
    expect([isDraftValid(netDraft(0), SETTINGS), isDraftValid(netDraft(20), SETTINGS)]).toEqual([false, true]);
  });
});

describe('weighedContainers', () => {
  it('counts every sack and crate across the Weighings', () => {
    const weighing = (sac: number, caisse: number): IWeighing => ({
      id: `${sac}-${caisse}`,
      kind: 'gross',
      grossKg: 100,
      containers: { sac, caisse },
      netKg: 90,
      source: 'manual',
      recordedAt: '2026-11-03T08:00:00Z',
      recordedBy: 'Hamid',
      isPendingSync: false,
    });
    expect(weighedContainers({ weighings: [weighing(4, 1), weighing(2, 3)] } as Pick<ILot, 'weighings'> as ILot)).toBe(10);
  });
});
