<template>
  <!-- PROTOTYPE: chosen Management Home (variant A, ticket 0019) with tabs: overview, production, finances, Clients, Tank schedule (?tab=). -->
  <section class="mx-auto flex max-w-6xl flex-col gap-5">
    <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
      <div class="flex flex-col gap-1.5">
        <h1 class="heading-one">Bonjour {{ authStore.salutation }}</h1>
        <p class="body-two">{{ scopeName }} · {{ SEASON.name }}, jour {{ SEASON.dayOfSeason }} · mis à jour à 11:04</p>
      </div>
      <p v-if="!isFinanceShown" class="chip bg-neutral-100 text-neutral-600">Finances masquées (autorisation « finance.view »)</p>
    </div>

    <nav class="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Sections">
      <button
        v-for="item in visibleTabs"
        :key="item.key"
        type="button"
        class="min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors"
        :class="tab === item.key ? 'border-primary-olive-dark bg-primary-olive-dark text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-olive-mid'"
        :aria-current="tab === item.key ? 'page' : undefined"
        @click="handleTab(item.key)"
      >
        {{ item.label }}
      </button>
    </nav>

    <template v-if="tab === 'overview'">
      <div v-if="isFinanceShown" class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-accent-gold/25 px-4 py-3 text-sm text-neutral-800">
        <span class="h-2 w-2 rounded-full bg-accent-rust" aria-hidden="true" />
        <a href="#" class="font-semibold underline-offset-4 hover:underline">{{ alerts.paymentsToConfirm }} paiements à confirmer ({{ formatDh(alerts.amountToConfirm) }})</a>
        <span class="text-neutral-400">·</span>
        <a href="#" class="underline-offset-4 hover:underline">{{ formatDh(alerts.amountToCollect) }} à encaisser</a>
      </div>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <kpi-tile label="Olives aujourd’hui" :value="kgNumber(today.oliveKg)" unit="kg" :sub="`${today.receptions} réceptions`" />
        <kpi-tile label="Huile aujourd’hui" :value="kgNumber(today.oilKg)" unit="kg" :sub="formatLitres(today.oilKg)" />
        <kpi-tile label="Rendement moyen" :value="today.yieldPct.toFixed(1)" unit="%" :delta="formatDelta(SEASON.yieldPct, SEASON.previousYieldPct)" :is-delta-good="SEASON.yieldPct >= SEASON.previousYieldPct" />
        <kpi-tile label="Remplissage cuves" :value="String(Math.round(tankFill * 100))" unit="%" :progress="tankFill * 100" />
      </div>

      <div class="card flex flex-wrap items-center gap-2 rounded-2xl p-4">
        <p class="label mr-2">File des lots</p>
        <span v-for="status in queueStatuses" :key="status" class="chip bg-neutral-100 px-3 py-1 text-sm text-neutral-700">
          {{ STATUS_LABELS[status] }} <span class="font-semibold tabular-nums">{{ queue[status] }}</span>
        </span>
        <a href="#" class="link ml-auto">Voir la file →</a>
      </div>

      <site-table v-if="siteStore.isAllSites" :is-finance-shown="isFinanceShown" />

      <div class="grid gap-3 lg:grid-cols-5">
        <div v-if="isFinanceShown" class="card flex flex-col gap-3 rounded-2xl p-5 lg:col-span-2">
          <p class="eyebrow text-neutral-500">Résultat net de la saison</p>
          <p class="text-4xl font-semibold tracking-tight text-primary-olive-dark tabular-nums">+{{ formatDh(season.netResult) }}</p>
          <p class="text-xs font-medium text-success-green">{{ formatDelta(SEASON.netResult, SEASON.previousNetResult) }} <span class="font-normal text-neutral-500">vs même date saison préc.</span></p>
          <dl class="flex flex-col divide-y divide-neutral-100 text-sm">
            <div v-for="line in season.breakdown" :key="line.label" class="flex justify-between py-2">
              <dt class="text-neutral-600">{{ line.label }}</dt>
              <dd class="font-medium tabular-nums" :class="line.amount < 0 ? 'text-danger-red' : 'text-neutral-900'">{{ line.amount > 0 ? '+' : '' }}{{ formatDh(line.amount) }}</dd>
            </div>
          </dl>
        </div>
        <week-bars :scale="scopeShare" :class="isFinanceShown ? 'lg:col-span-3' : 'lg:col-span-5'" />
      </div>

      <div class="grid gap-3 lg:grid-cols-5">
        <tank-cards :tanks="scopeTanks" class="lg:col-span-3" />
        <follow-ups class="lg:col-span-2" />
      </div>
    </template>
    <production-tab v-else-if="tab === 'production'" :scale="scopeShare" />
    <finance-tab v-else-if="tab === 'finance'" :scale="scopeShare" />
    <clients-tab v-else-if="tab === 'clients'" :is-finance-shown="isFinanceShown" />
    <tank-gantt v-else :tanks="scopeTanks" />
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — chosen Management Home (ticket 0019). Mock figures only.
// imports
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import {
  ALERTS,
  createLots,
  formatDelta,
  formatDh,
  formatLitres,
  LOT_STATUSES,
  SEASON,
  SITE_FIGURES,
  STATUS_LABELS,
  TANKS,
  type LotStatus,
} from 'dashboard/prototype/mock-home.prototype';

import ClientsTab from 'dashboard/prototype/clients-tab.prototype.vue';
import FinanceTab from 'dashboard/prototype/finance-tab.prototype.vue';
import FollowUps from 'dashboard/prototype/follow-ups.prototype.vue';
import KpiTile from 'dashboard/prototype/kpi-tile.prototype.vue';
import ProductionTab from 'dashboard/prototype/production-tab.prototype.vue';
import SiteTable from 'dashboard/prototype/site-table.prototype.vue';
import TankCards from 'dashboard/prototype/tank-cards.prototype.vue';
import TankGantt from 'dashboard/prototype/tank-gantt.prototype.vue';
import WeekBars from 'dashboard/prototype/week-bars.prototype.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const route = useRoute();
const router = useRouter();

// variables
type HomeTab = 'overview' | 'production' | 'finance' | 'clients' | 'tanks';
const TABS: { key: HomeTab; label: string; isFinance?: boolean }[] = [
  { key: 'overview', label: 'Vue d’ensemble' },
  { key: 'production', label: 'Production' },
  { key: 'finance', label: 'Finances', isFinance: true },
  { key: 'clients', label: 'Clients' },
  { key: 'tanks', label: 'Planning cuves' },
];
const lots = createLots();
const queueStatuses: LotStatus[] = LOT_STATUSES.filter((status) => status !== 'withdrawn');
const totalRevenue = SITE_FIGURES.reduce((sum, site) => sum + site.revenueSeason, 0);

// computed
const visibleTabs = computed(() => TABS.filter((item) => !item.isFinance || isFinanceShown.value));
const tab = computed((): HomeTab => {
  const key = String(route.query.tab ?? 'overview');
  return visibleTabs.value.find((item) => item.key === key)?.key ?? 'overview';
});
const isFinanceShown = computed((): boolean => authStore.can('finance.view'));
const scopeSites = computed(() => (siteStore.isAllSites ? SITE_FIGURES : SITE_FIGURES.filter((site) => site.siteId === siteStore.currentSiteId)));
const scopeName = computed((): string => (siteStore.isAllSites ? 'Tous les sites' : (siteStore.currentSite?.name ?? '')));
const scopeShare = computed((): number => scopeSites.value.reduce((sum, site) => sum + site.revenueSeason, 0) / totalRevenue || 1);
const scopeTanks = computed(() => (siteStore.isAllSites ? TANKS : TANKS.filter((tank) => tank.siteId === siteStore.currentSiteId)));
const tankFill = computed((): number => {
  const capacity = scopeTanks.value.reduce((sum, tank) => sum + tank.capacityKg, 0);
  return capacity ? scopeTanks.value.reduce((sum, tank) => sum + tank.fillKg, 0) / capacity : 0;
});
const today = computed(() => {
  const oliveKg = scopeSites.value.reduce((sum, site) => sum + site.oliveKgToday, 0);
  const oilKg = scopeSites.value.reduce((sum, site) => sum + site.oilKgToday, 0);
  return {
    oliveKg,
    oilKg,
    receptions: scopeSites.value.reduce((sum, site) => sum + site.receptionsToday, 0),
    yieldPct: oliveKg ? scopeSites.value.reduce((sum, site) => sum + site.yieldPct * site.oliveKgToday, 0) / oliveKg : 0,
  };
});
const queue = computed(
  (): Record<LotStatus, number> =>
    Object.fromEntries(
      LOT_STATUSES.map((status) => [
        status,
        lots.filter((lot) => lot.status === status && (siteStore.isAllSites || lot.siteId === siteStore.currentSiteId)).length,
      ]),
    ) as Record<LotStatus, number>,
);
const alerts = computed(() => ({
  paymentsToConfirm: Math.max(1, Math.round(ALERTS.paymentsToConfirm * scopeShare.value)),
  amountToConfirm: ALERTS.amountToConfirm * scopeShare.value,
  amountToCollect: ALERTS.amountToCollect * scopeShare.value,
}));
const season = computed(() => ({
  netResult: SEASON.netResult * scopeShare.value,
  breakdown: SEASON.breakdown.map((line) => ({ ...line, amount: line.amount * scopeShare.value })),
}));

// methods
const kgNumber = (value: number): string => Math.round(value).toLocaleString('fr-FR');

// event handlers
const handleTab = (key: HomeTab): void => {
  router.replace({ query: { ...route.query, tab: key === 'overview' ? undefined : key } });
};
</script>
