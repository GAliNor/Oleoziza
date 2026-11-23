import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSeasonStore } from 'season/stores/season';
import { useSiteStore } from 'site/stores/site';
import { isDayLocked, seasonOfDay } from 'season/composables/season-of-day';
import { todayIso } from 'global/composables/date';

/** Where a payment counts, said while its date is picked: the Season and the Site, or why that day can't be used. */
export const useExpenseSeason = (siteId: () => string, date: () => string | null): { seasonLineComputed: ComputedRef<string>; dateProblemComputed: ComputedRef<string | null> } => {
  const { t } = useI18n();
  const seasonStore = useSeasonStore();
  const siteStore = useSiteStore();

  const seasonComputed = computed(() => (date() ? seasonOfDay(seasonStore.seasons, date() ?? '') : undefined));
  const siteNameComputed = computed((): string => siteStore.sites.find((site) => site.id === siteId())?.name ?? '');

  const dateProblemComputed = computed((): string | null => {
    const day = date();
    if (!day) return t('global.form.required');
    if (day > todayIso()) return t('global.errors.date_in_future');
    if (seasonStore.seasons.length && !seasonComputed.value) return t('global.errors.season_missing');
    return seasonComputed.value && isDayLocked(seasonComputed.value, day) ? t('global.errors.season_closed') : null;
  });
  const seasonLineComputed = computed((): string => {
    if (!seasonComputed.value || dateProblemComputed.value) return '';
    const isOffSeason = seasonComputed.value.status === 'closed';
    return t(isOffSeason ? 'expense.season.countedOff' : 'expense.season.counted', { season: seasonComputed.value.label, site: siteNameComputed.value });
  });

  return { seasonLineComputed, dateProblemComputed };
};
