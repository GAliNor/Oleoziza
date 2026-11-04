import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

import { formatShortDate, shiftDate, todayIso } from 'global/composables/date';
import type { ITankStorage } from 'dashboard/types/dashboard';
import type { IPeriod } from 'global/types/period';

const DAYS_SHOWN_AFTER_TODAY = 3;
const MINIMUM_DAYS = 7;
const DAYS_IN_YEAR = 365;

export const dayLabel = (offset: number): string => formatShortDate(shiftDate(todayIso(), offset));

export const isInWindow = (entry: ITankStorage, startDay: number, endDay: number): boolean => entry.startDay <= endDay && (entry.endDay ?? Infinity) >= startDay;

/** The days the Tank planning shows, with arrows that page through them. */
export const useTankWindow = (
  period: () => IPeriod,
): { offset: Ref<number>; periodDays: ComputedRef<number>; startDay: ComputedRef<number>; endDay: ComputedRef<number> } => {
  const offset = ref(0);
  const periodDays = computed((): number => Math.max(period().days, MINIMUM_DAYS));
  const startDay = computed((): number => offset.value - periodDays.value + DAYS_SHOWN_AFTER_TODAY + 1);
  const endDay = computed((): number => startDay.value + periodDays.value - 1);

  watch(
    () => period().key,
    (key) => {
      offset.value = key === 'previous' ? -DAYS_IN_YEAR : 0;
    },
  );

  return { offset, periodDays, startDay, endDay };
};
