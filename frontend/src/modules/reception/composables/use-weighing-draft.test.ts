import { describe, expect, it } from 'vitest';

import { useWeighingDraft } from 'reception/composables/use-weighing-draft';
import type { ISiteReceptionSettings } from 'reception/types/reception';

const SETTINGS: ISiteReceptionSettings = { containerTareKg: { sac: 0.6, caisse: 2 }, dailyPricePerKg: null };

const setup = () => useWeighingDraft(() => SETTINGS);

describe('useWeighingDraft', () => {
  it('types into the gross weight and marks it manual', () => {
    const { draft, typedValue, setScaleReading } = setup();
    setScaleReading(500);
    typedValue.value = 480;
    expect([draft.value.grossKg, draft.value.source]).toEqual([480, 'manual']);
  });

  it('types into the net weight when weighing net, leaving the gross alone', () => {
    const { draft, typedValue } = setup();
    draft.value.kind = 'net';
    typedValue.value = 300;
    expect([draft.value.netKgTyped, draft.value.grossKg, typedValue.value]).toEqual([300, null, 300]);
  });

  it('marks a scale reading as coming from the scale', () => {
    const { draft, setScaleReading, typedValue } = setup();
    setScaleReading(512);
    expect([typedValue.value, draft.value.source]).toEqual([512, 'scale']);
  });

  it('works out tare and net, and flags a tare over the gross', () => {
    const { draft, typedValue, tare, net, isValid, isTareTooHigh } = setup();
    typedValue.value = 100;
    draft.value.containers.sac = 10;
    expect([tare.value, net.value, isValid.value, isTareTooHigh.value]).toEqual([6, 94, true, false]);
    draft.value.containers.caisse = 50;
    expect([isValid.value, isTareTooHigh.value]).toEqual([false, true]);
  });

  it('starts a new draft with a new id, keeping the kind', () => {
    const { draft, typedValue, reset } = setup();
    draft.value.kind = 'net';
    typedValue.value = 300;
    const firstId = draft.value.id;
    reset();
    expect([draft.value.kind, draft.value.netKgTyped, draft.value.id === firstId]).toEqual(['net', null, false]);
  });
});
