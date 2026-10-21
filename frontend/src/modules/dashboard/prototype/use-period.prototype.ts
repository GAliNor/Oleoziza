// PROTOTYPE — global period filter of the Management Home, kept in the URL as ?period= (ticket 0019 follow-up).
import { computed, type ComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export type PeriodKey = 'today' | 'week' | 'month' | 'season' | 'previous';

export interface IPeriodPrototype {
  key: PeriodKey;
  label: string;
  noun: string;
  factor: number;
  days: number;
}

export const PERIODS: IPeriodPrototype[] = [
  { key: 'today', label: 'Aujourd’hui', noun: 'aujourd’hui', factor: 0.034, days: 1 },
  { key: 'week', label: '7 jours', noun: 'sur 7 jours', factor: 0.21, days: 7 },
  { key: 'month', label: 'Ce mois', noun: 'ce mois', factor: 0.74, days: 30 },
  { key: 'season', label: 'Cette saison', noun: 'cette saison', factor: 1, days: 42 },
  { key: 'previous', label: 'Saison préc.', noun: 'saison 2025-2026', factor: 1.62, days: 42 },
];

export const usePeriod = (): { period: ComputedRef<IPeriodPrototype>; selectPeriod: (key: PeriodKey) => void } => {
  const route = useRoute();
  const router = useRouter();
  const period = computed((): IPeriodPrototype => PERIODS.find((item) => item.key === route.query.period) ?? PERIODS[0]);
  const selectPeriod = (key: PeriodKey): void => {
    router.replace({ query: { ...route.query, period: key === 'today' ? undefined : key } });
  };
  return { period, selectPeriod };
};
