import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { shiftDate, todayIso } from 'global/composables/date';
import { DEFAULT_PERIOD, PERIOD_DAYS, PREVIOUS_SEASON, SEASON_START } from 'global/constants/period';
import type { IPeriod, IPeriodRange, PeriodKey } from 'global/types/period';

const PERIOD_KEYS = Object.keys(PERIOD_DAYS) as PeriodKey[];

/** The calendar days a period covers, ending today in Morocco time. */
export const periodRange = (key: PeriodKey, today: string = todayIso()): IPeriodRange => {
  if (key === 'today') return { from: today, to: today };
  if (key === 'week') return { from: shiftDate(today, -6), to: today };
  if (key === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  return key === 'season' ? { from: SEASON_START, to: today } : PREVIOUS_SEASON;
};

/** The period filter shared by the Management pages, kept in the URL as ?period=. */
export const usePeriod = (): { period: ComputedRef<IPeriod>; periodOptions: ComputedRef<IPeriod[]>; selectPeriod: (key: PeriodKey) => void } => {
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const periodOptions = computed((): IPeriod[] =>
    PERIOD_KEYS.map((key) => ({ key, label: t(`global.period.${key}.label`), noun: t(`global.period.${key}.noun`), days: PERIOD_DAYS[key] })),
  );
  const period = computed((): IPeriod => periodOptions.value.find((item) => item.key === (route.query.period ?? DEFAULT_PERIOD)) ?? periodOptions.value[1]);

  const selectPeriod = (key: PeriodKey): void => {
    router.replace({ query: { ...route.query, period: key === DEFAULT_PERIOD ? undefined : key } });
  };

  return { period, periodOptions, selectPeriod };
};
