<template>
  <div class="flex min-w-0 flex-col gap-5">
    <div class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
      <div class="stagger flex min-w-0 flex-col gap-5" :class="isFinanceShown ? 'lg:col-span-2' : 'lg:col-span-3'">
        <p class="eyebrow">{{ $t('dashboard.management.overview.production') }}</p>
        <div class="-mt-3 grid grid-cols-2 gap-3">
          <ui-stat-tile v-for="tile in productionTiles" :key="tile.label" v-bind="tile" />
        </div>
        <site-table v-if="siteStore.isAllSites" :sites="dashboard.sites" :is-finance-shown="isFinanceShown" />
        <olive-chart :chart="dashboard.oliveChart" />
      </div>
      <div v-if="isFinanceShown" class="stagger flex min-w-0 flex-col gap-5">
        <p class="eyebrow">{{ $t('dashboard.management.overview.sales') }}</p>
        <template v-if="figures && financeStore.sales">
          <sales-tiles :figures="figures" :period-label="period.label" layout="stacked" class="-mt-3" />
          <sales-lines :title="$t(financeStore.sales.chartTitleKey)" :bars="financeStore.sales.bars" />
        </template>
        <div v-else class="-mt-3 skeleton h-64 rounded-card" />
      </div>
    </div>
    <section class="rise flex min-w-0 flex-col gap-3">
      <div class="flex items-baseline justify-between gap-3">
        <p class="eyebrow">{{ $t('dashboard.management.lines.title') }}</p>
        <router-link :to="{ name: 'lot' }" class="link">{{ $t('dashboard.management.lines.open') }}</router-link>
      </div>
      <site-press-lines v-for="site in lineSites" :key="site.siteId" :site-id="site.siteId" :title="siteStore.isAllSites ? site.name : undefined" />
    </section>
    <tank-cards class="rise" :tanks="dashboard.tanks" />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useSiteStore } from 'site/stores/site';
import { useFinance } from 'finance/composables/use-finance';
import { formatDelta } from 'global/composables/number';
import type { IDashboard } from 'dashboard/types/dashboard';
import type { IPeriod } from 'global/types/period';

import OliveChart from 'dashboard/components/olive-chart.vue';
import SalesLines from 'dashboard/components/sales-lines.vue';
import SitePressLines from 'dashboard/components/site-press-lines.vue';
import SiteTable from 'dashboard/components/site-table.vue';
import TankCards from 'dashboard/components/tank-cards.vue';
import SalesTiles from 'finance/components/sales-tiles.vue';
import UiStatTile from 'global/components/ui-stat-tile.vue';

// props
const props = defineProps<{ period: IPeriod; dashboard: IDashboard; isFinanceShown: boolean }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const siteStore = useSiteStore();
const { figures } = useFinance();

// computed
const lineSites = computed((): { siteId: string; name: string }[] =>
  siteStore.isAllSites ? props.dashboard.sites.map((site) => ({ siteId: site.siteId, name: site.name })) : siteStore.currentSiteId ? [{ siteId: siteStore.currentSiteId, name: '' }] : [],
);
const tankFill = computed((): number => {
  const capacity = props.dashboard.tanks.reduce((sum, tank) => sum + tank.capacityLitres, 0);
  return capacity ? props.dashboard.tanks.reduce((sum, tank) => sum + tank.fillLitres, 0) / capacity : 0;
});
const productionTiles = computed(() => {
  const { production, season } = props.dashboard;
  const kilogram = t('global.units.kilogram');
  return [
    { label: t('dashboard.management.overview.olives', { period: props.period.label }), value: production.oliveKg, unit: kilogram, sub: t('dashboard.management.overview.receptions', { count: production.receptions }) },
    { label: t('dashboard.management.overview.oil', { period: props.period.label }), value: production.oilLitres, unit: t('global.units.litre') },
    {
      label: t('dashboard.management.yield'),
      value: production.yieldPerQuintal,
      decimals: 1,
      unit: t('global.units.litrePerQuintal'),
      delta: formatDelta(season.yieldDeltaPct),
      deltaLabel: t('dashboard.management.vsPreviousSeason'),
      isDeltaGood: season.yieldDeltaPct >= 0,
    },
    { label: t('dashboard.management.overview.tankFill'), value: Math.round(tankFill.value * 100), unit: '%', progress: tankFill.value * 100 },
  ];
});
</script>
