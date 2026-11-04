import { computed, ref, type ComputedRef, type Ref, type WritableComputedRef } from 'vue';

import { createWeighingDraft, draftNetKg, isDraftValid, isTareOverGross, tareKg } from 'reception/composables/weighing';
import type { ISiteReceptionSettings, IWeighingDraft } from 'reception/types/reception';

/** The Weighing being entered: what was typed, its tare and net, and whether it can be added. */
export const useWeighingDraft = (
  settings: () => ISiteReceptionSettings | null,
): {
  draft: Ref<IWeighingDraft>;
  typedValue: WritableComputedRef<number | null>;
  tare: ComputedRef<number>;
  net: ComputedRef<number>;
  isValid: ComputedRef<boolean>;
  isTareTooHigh: ComputedRef<boolean>;
  setScaleReading: (grossKg: number) => void;
  reset: () => void;
} => {
  const draft = ref<IWeighingDraft>(createWeighingDraft());

  const typedValue = computed({
    get: (): number | null => (draft.value.kind === 'gross' ? draft.value.grossKg : draft.value.netKgTyped),
    set: (value: number | null): void => {
      if (draft.value.kind === 'gross') {
        draft.value.grossKg = value;
        draft.value.source = 'manual';
      } else draft.value.netKgTyped = value;
    },
  });
  const tare = computed((): number => tareKg(draft.value.containers, settings()));
  const net = computed((): number => draftNetKg(draft.value, settings()));
  const isValid = computed((): boolean => isDraftValid(draft.value, settings()));
  const isTareTooHigh = computed((): boolean => isTareOverGross(draft.value, settings()));

  const setScaleReading = (grossKg: number): void => {
    draft.value.grossKg = grossKg;
    draft.value.source = 'scale';
  };

  const reset = (): void => {
    draft.value = createWeighingDraft(draft.value.kind);
  };

  return { draft, typedValue, tare, net, isValid, isTareTooHigh, setScaleReading, reset };
};
