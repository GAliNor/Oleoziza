<template>
  <!-- PROTOTYPE: three variants of the Management Home on the existing "/" route, switchable via ?variant=A|B|C (ticket 0019). -->
  <section class="mx-auto flex max-w-6xl flex-col gap-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 class="heading-one">Bonjour {{ authStore.salutation }}</h1>
        <p class="body-two">{{ scopeName }} · {{ SEASON.name }}, jour {{ SEASON.dayOfSeason }} · mis à jour à 11:04</p>
      </div>
      <p v-if="!isFinanceShown" class="chip bg-neutral-100 text-neutral-600">Finances masquées (autorisation « finance.view »)</p>
    </div>

    <!-- A: reference 17 stack, alert band → today → queue → Season → week → Tanks → Clients -->
    <template v-if="variant === 'A'">
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

    <!-- B: two columns, Today (live) on the left, Season on the right -->
    <template v-else-if="variant === 'B'">
      <site-table v-if="siteStore.isAllSites" :is-finance-shown="isFinanceShown" />
      <div class="grid items-start gap-5 lg:grid-cols-2">
        <div class="flex flex-col gap-3">
          <h2 class="flex items-center gap-2 text-sm font-semibold tracking-widest text-neutral-500 uppercase">
            <span class="h-2 w-2 animate-pulse rounded-full bg-success-green" /> Aujourd’hui
          </h2>
          <div class="rounded-3xl bg-primary-olive-dark p-6 text-white">
            <div class="grid grid-cols-3 gap-4">
              <div>
                <p class="text-xs text-primary-olive-light uppercase">Olives</p>
                <p class="text-2xl font-semibold tabular-nums">{{ kgNumber(today.oliveKg) }}</p>
                <p class="text-xs text-primary-olive-light">kg · {{ today.receptions }} réceptions</p>
              </div>
              <div>
                <p class="text-xs text-primary-olive-light uppercase">Huile</p>
                <p class="text-2xl font-semibold tabular-nums">{{ kgNumber(today.oilKg) }}</p>
                <p class="text-xs text-primary-olive-light">kg · {{ formatLitres(today.oilKg) }}</p>
              </div>
              <div>
                <p class="text-xs text-primary-olive-light uppercase">Rendement</p>
                <p class="text-2xl font-semibold tabular-nums">{{ today.yieldPct.toFixed(1) }} %</p>
              </div>
            </div>
            <div class="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full">
              <div v-for="status in queueStatuses" :key="status" class="bg-white" :style="{ flex: queue[status] || 0.0001, opacity: 0.35 + queueStatuses.indexOf(status) * 0.17 }" />
            </div>
            <div class="mt-2 flex justify-between text-xs text-primary-olive-light">
              <span v-for="status in queueStatuses" :key="status">{{ STATUS_LABELS[status] }} {{ queue[status] }}</span>
            </div>
          </div>
          <div v-if="isFinanceShown" class="grid grid-cols-2 gap-3">
            <a href="#" class="card rounded-2xl p-4 hover:border-accent-rust">
              <p class="text-2xl font-semibold text-accent-rust tabular-nums">{{ alerts.paymentsToConfirm }}</p>
              <p class="body-two">paiements à confirmer</p>
            </a>
            <a href="#" class="card rounded-2xl p-4 hover:border-accent-rust">
              <p class="text-2xl font-semibold text-neutral-900 tabular-nums">{{ formatDh(alerts.amountToCollect) }}</p>
              <p class="body-two">à encaisser</p>
            </a>
          </div>
          <week-bars :scale="scopeShare" />
        </div>

        <div class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold tracking-widest text-neutral-500 uppercase">Saison · jour {{ SEASON.dayOfSeason }}</h2>
          <div class="card rounded-2xl p-0">
            <div v-for="row in seasonRows" :key="row.label" class="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 last:border-0">
              <p class="text-neutral-600">{{ row.label }}</p>
              <div class="text-right">
                <p class="text-xl font-semibold text-neutral-900 tabular-nums">{{ row.value }}</p>
                <p class="text-xs" :class="row.isGood ? 'text-success-green' : 'text-danger-red'">{{ row.delta }} vs N-1</p>
              </div>
            </div>
          </div>
          <tank-cards :tanks="scopeTanks" />
          <follow-ups />
        </div>
      </div>
    </template>

    <!-- C: exceptions first, a short briefing then a figures table -->
    <template v-else>
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <p class="text-xl leading-relaxed text-neutral-800 md:text-2xl">
          Aujourd’hui, <strong class="text-primary-olive-dark">{{ formatKg(today.oliveKg) }}</strong> d’olives reçues en
          {{ today.receptions }} réceptions, <strong class="text-primary-olive-dark">{{ formatKg(today.oilKg) }}</strong> d’huile produite
          à {{ today.yieldPct.toFixed(1) }} % de rendement. {{ queue.waiting }} lots attendent le pressage.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="label">À traiter</h2>
        <a
          v-for="item in exceptions"
          :key="item.title"
          href="#"
          class="card flex items-center gap-4 rounded-2xl p-4 hover:border-primary-olive-mid"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold" :class="item.tone">{{ item.icon }}</span>
          <div class="min-w-0 flex-1">
            <p class="font-medium text-neutral-900">{{ item.title }}</p>
            <p class="body-two">{{ item.detail }}</p>
          </div>
          <span class="text-neutral-400">→</span>
        </a>
      </div>

      <site-table v-if="siteStore.isAllSites" :is-finance-shown="isFinanceShown" />

      <div class="card overflow-x-auto rounded-2xl p-0">
        <table class="w-full min-w-[520px] text-sm">
          <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
            <tr>
              <th class="px-4 py-3 font-semibold">Indicateur</th>
              <th class="px-4 py-3 text-right font-semibold">Aujourd’hui</th>
              <th class="px-4 py-3 text-right font-semibold">Saison</th>
              <th class="px-4 py-3 text-right font-semibold">vs N-1</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in figureRows" :key="row.label" class="border-t border-neutral-100">
              <td class="px-4 py-3 text-neutral-700">{{ row.label }}</td>
              <td class="px-4 py-3 text-right font-medium tabular-nums">{{ row.today }}</td>
              <td class="px-4 py-3 text-right font-medium tabular-nums">{{ row.season }}</td>
              <td class="px-4 py-3 text-right text-xs font-medium tabular-nums" :class="row.isGood ? 'text-success-green' : 'text-danger-red'">{{ row.delta }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <week-bars :scale="scopeShare" />
        <tank-cards :tanks="scopeTanks" />
      </div>
    </template>

    <prototype-switcher :variants="VARIANTS" />
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — Management Home variants (ticket 0019). Mock figures only.
// imports
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import {
  ALERTS,
  createLots,
  formatDelta,
  formatDh,
  formatKg,
  formatLitres,
  LOT_STATUSES,
  SEASON,
  SITE_FIGURES,
  STATUS_LABELS,
  TANKS,
  type LotStatus,
} from 'dashboard/prototype/mock-home.prototype';

import FollowUps from 'dashboard/prototype/follow-ups.prototype.vue';
import KpiTile from 'dashboard/prototype/kpi-tile.prototype.vue';
import SiteTable from 'dashboard/prototype/site-table.prototype.vue';
import TankCards from 'dashboard/prototype/tank-cards.prototype.vue';
import WeekBars from 'dashboard/prototype/week-bars.prototype.vue';
import PrototypeSwitcher from 'global/components/prototype-switcher.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const route = useRoute();

// variables
const VARIANTS = { A: 'Coup d’œil (réf. 17)', B: 'Aujourd’hui | Saison', C: 'Exceptions d’abord' };
const lots = createLots();
const queueStatuses: LotStatus[] = LOT_STATUSES.filter((status) => status !== 'withdrawn');
const totalRevenue = SITE_FIGURES.reduce((sum, site) => sum + site.revenueSeason, 0);

// computed
const variant = computed((): string => (['A', 'B', 'C'].includes(String(route.query.variant)) ? String(route.query.variant) : 'A'));
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
const seasonRows = computed(() => [
  { label: 'Olives reçues', value: formatKg(SEASON.olivesKg * scopeShare.value), delta: formatDelta(SEASON.olivesKg, SEASON.previousOlivesKg), isGood: true },
  { label: 'Huile produite', value: formatKg(SEASON.oilKg * scopeShare.value), delta: formatDelta(SEASON.oilKg, SEASON.previousOilKg), isGood: true },
  { label: 'Rendement moyen', value: `${SEASON.yieldPct.toFixed(1)} %`, delta: formatDelta(SEASON.yieldPct, SEASON.previousYieldPct), isGood: false },
  ...(isFinanceShown.value
    ? [{ label: 'Résultat net', value: formatDh(season.value.netResult), delta: formatDelta(SEASON.netResult, SEASON.previousNetResult), isGood: true }]
    : []),
]);
const figureRows = computed(() => [
  { label: 'Olives reçues', today: formatKg(today.value.oliveKg), season: formatKg(SEASON.olivesKg * scopeShare.value), delta: formatDelta(SEASON.olivesKg, SEASON.previousOlivesKg), isGood: true },
  { label: 'Huile produite', today: formatKg(today.value.oilKg), season: formatKg(SEASON.oilKg * scopeShare.value), delta: formatDelta(SEASON.oilKg, SEASON.previousOilKg), isGood: true },
  { label: 'Rendement moyen', today: `${today.value.yieldPct.toFixed(1)} %`, season: `${SEASON.yieldPct.toFixed(1)} %`, delta: formatDelta(SEASON.yieldPct, SEASON.previousYieldPct), isGood: false },
  ...(isFinanceShown.value
    ? [{ label: 'Résultat net', today: '—', season: formatDh(season.value.netResult), delta: formatDelta(SEASON.netResult, SEASON.previousNetResult), isGood: true }]
    : []),
]);
const exceptions = computed(() => {
  const items = [];
  if (isFinanceShown.value) {
    items.push({ icon: 'DH', tone: 'bg-accent-gold/30 text-accent-brown', title: `${alerts.value.paymentsToConfirm} paiements à confirmer`, detail: `${formatDh(alerts.value.amountToConfirm)} en attente de votre validation` });
  }
  const fullTank = scopeTanks.value.find((tank) => tank.fillKg / tank.capacityKg >= 0.9);
  if (fullTank) items.push({ icon: '◧', tone: 'bg-accent-sand/30 text-accent-brown', title: `${fullTank.name} presque pleine`, detail: `${Math.round((fullTank.fillKg / fullTank.capacityKg) * 100)} % · prévoir une autre cuve` });
  items.push({ icon: '−', tone: 'bg-danger-red/10 text-danger-red', title: 'Rendement en baisse', detail: `${SEASON.yieldPct.toFixed(1)} % sur la saison contre ${SEASON.previousYieldPct.toFixed(1)} % à la même date l’an dernier` });
  items.push({ icon: '☏', tone: 'bg-info-blue/10 text-info-blue', title: '2 clients à relancer', detail: 'Coopérative Angad (solde 21 jours), Hassan Ziani (huile non retirée)' });
  return items;
});

// methods
const kgNumber = (value: number): string => Math.round(value).toLocaleString('fr-FR');
</script>
