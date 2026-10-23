<template>
  <div class="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
    <div class="stagger flex min-w-0 flex-col gap-5 lg:col-span-2">
      <p class="eyebrow text-neutral-500">Production</p>
      <div class="-mt-3 grid grid-cols-2 gap-3">
        <kpi-tile v-for="tile in productionTiles" :key="tile.label" v-bind="tile" />
      </div>
      <lot-queue-strip :queue="queue" />
      <site-table v-if="siteStore.isAllSites" :is-finance-shown="isFinanceShown" />
      <week-bars :title="olivesChart.title" unit="kg" :bars="olivesChart.bars" />
      <tank-cards :tanks="tanks" />
    </div>
    <div class="stagger flex min-w-0 flex-col gap-5">
      <template v-if="isFinanceShown">
        <p class="eyebrow text-neutral-500">Ventes</p>
        <money-tiles :figures="sales" :period="period" is-stacked class="-mt-3" />
        <sales-lines :title="salesChart.title" :bars="salesChart.bars" />
      </template>
      <served-clients :period="period" :limit="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — "Vue d'ensemble" tab v2, variant C of ticket 0028: production on the left, sales and "Clients traités" on the right.
// imports
import { computed } from 'vue';

import { useSiteStore } from 'global/stores/site';
import {
  createLots,
  formatDelta,
  formatLitres,
  LOT_STATUSES,
  olivesBars,
  salesBars,
  salesFigures,
  SEASON,
  SITE_FIGURES,
  type ITankPrototype,
  type LotStatus,
} from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';

import KpiTile from 'dashboard/prototype/kpi-tile.prototype.vue';
import LotQueueStrip from 'dashboard/prototype/lot-queue-strip.prototype.vue';
import MoneyTiles from 'dashboard/prototype/money-tiles.prototype.vue';
import SalesLines from 'dashboard/prototype/sales-lines.prototype.vue';
import ServedClients from 'dashboard/prototype/served-clients.prototype.vue';
import SiteTable from 'dashboard/prototype/site-table.prototype.vue';
import TankCards from 'dashboard/prototype/tank-cards.prototype.vue';
import WeekBars from 'dashboard/prototype/week-bars.prototype.vue';

// props
const props = defineProps<{ period: IPeriodPrototype; scale: number; tanks: ITankPrototype[]; isFinanceShown: boolean }>();

// stores
const siteStore = useSiteStore();

// variables
const lots = createLots();

// computed
const factor = computed((): number => props.scale * props.period.factor);
const scopeSites = computed(() => (siteStore.isAllSites ? SITE_FIGURES : SITE_FIGURES.filter((site) => site.siteId === siteStore.currentSiteId)));
const tankFill = computed((): number => {
  const capacity = props.tanks.reduce((sum, tank) => sum + tank.capacityKg, 0);
  return capacity ? props.tanks.reduce((sum, tank) => sum + tank.fillKg, 0) / capacity : 0;
});
const production = computed(() => {
  if (props.period.key !== 'today') {
    return {
      oliveKg: SEASON.olivesKg * factor.value,
      oilKg: SEASON.oilKg * factor.value,
      receptions: Math.round(452 * factor.value),
      yieldPct: props.period.key === 'previous' ? SEASON.previousYieldPct : SEASON.yieldPct,
    };
  }
  const oliveKg = scopeSites.value.reduce((sum, site) => sum + site.oliveKgToday, 0);
  return {
    oliveKg,
    oilKg: scopeSites.value.reduce((sum, site) => sum + site.oilKgToday, 0),
    receptions: scopeSites.value.reduce((sum, site) => sum + site.receptionsToday, 0),
    yieldPct: oliveKg ? scopeSites.value.reduce((sum, site) => sum + site.yieldPct * site.oliveKgToday, 0) / oliveKg : 0,
  };
});
const productionTiles = computed(() => [
  { label: `Olives · ${props.period.label}`, value: production.value.oliveKg, unit: 'kg', sub: `${production.value.receptions} réceptions` },
  { label: `Huile · ${props.period.label}`, value: production.value.oilKg, unit: 'kg', sub: formatLitres(production.value.oilKg) },
  {
    label: 'Rendement moyen',
    value: production.value.yieldPct,
    decimals: 1,
    unit: '%',
    delta: formatDelta(SEASON.yieldPct, SEASON.previousYieldPct),
    isDeltaGood: SEASON.yieldPct >= SEASON.previousYieldPct,
  },
  { label: 'Remplissage cuves', value: Math.round(tankFill.value * 100), unit: '%', progress: tankFill.value * 100 },
]);
const queue = computed(
  (): Record<LotStatus, number> =>
    Object.fromEntries(
      LOT_STATUSES.map((status) => [
        status,
        lots.filter((lot) => lot.status === status && (siteStore.isAllSites || lot.siteId === siteStore.currentSiteId)).length,
      ]),
    ) as Record<LotStatus, number>,
);
const sales = computed(() => salesFigures(factor.value));
const salesChart = computed(() => salesBars(props.period.key, props.scale));
const olivesChart = computed(() => olivesBars(props.period.key, props.scale));
</script>
