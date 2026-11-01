// PROTOTYPE — in-memory Lots shared by the Opérations views (ticket 0036).
import { computed, ref } from 'vue';

import { useSiteStore } from 'global/stores/site';
import { usePeriod, type PeriodKey } from 'dashboard/prototype/use-period.prototype';
import { createLotRecords, TODAY, type ILotRecordPrototype } from 'lot/prototype/mock-lots.prototype';

const lots = ref<ILotRecordPrototype[]>(createLotRecords());

const SEASON_START = '2026-10-01';

const PERIOD_RANGES: Record<PeriodKey, { from: string; to: string }> = {
  today: { from: TODAY, to: TODAY },
  week: { from: '2026-10-18', to: TODAY },
  month: { from: `${TODAY.slice(0, 7)}-01`, to: TODAY },
  season: { from: SEASON_START, to: TODAY },
  previous: { from: '2025-10-01', to: '2026-03-31' },
};

export const useLotsPrototype = () => {
  // stores
  const siteStore = useSiteStore();
  const { period, selectPeriod } = usePeriod();

  // computed
  const scoped = computed((): ILotRecordPrototype[] => {
    const { from, to } = PERIOD_RANGES[period.value.key];
    return lots.value
      .filter((lot) => siteStore.isAllSites || lot.siteId === siteStore.currentSiteId)
      .filter((lot) => lot.receivedAt.slice(0, 10) >= from && lot.receivedAt.slice(0, 10) <= to)
      .sort((first, second) => second.receivedAt.localeCompare(first.receivedAt));
  });
  const isReadOnly = computed((): boolean => siteStore.isAllSites);

  // methods
  const find = (id: string | null): ILotRecordPrototype | undefined => lots.value.find((lot) => lot.id === id);

  const siteName = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.name ?? '—';

  return { lots, scoped, period, selectPeriod, isReadOnly, find, siteName };
};
