<template>
  <!-- PROTOTYPE: Management Home v2 (tickets 0019, 0028, 0029, 0031) with tabs (?tab=) and a global period (?period=). -->
  <section class="mx-auto flex max-w-6xl min-w-0 flex-col gap-5">
    <div class="rise mb-1 flex flex-wrap items-end justify-between gap-2">
      <div class="flex flex-col gap-1.5">
        <h1 class="heading-one">Bonjour {{ authStore.salutation }}</h1>
        <p class="body-two">{{ scopeName }}</p>
      </div>
      <p v-if="!isFinanceShown" class="chip bg-neutral-100 text-neutral-600">Finances masquées (autorisation « finance.view »)</p>
    </div>

    <div class="rise flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <segmented-control :model-value="tab" :options="visibleTabs" is-dark aria-label="Sections" @update:model-value="handleTab" />
      <segmented-control :model-value="period.key" :options="PERIODS" aria-label="Période" @update:model-value="selectPeriod" />
    </div>

    <Transition name="tab-switch" mode="out-in">
      <overview-tab v-if="tab === 'overview'" key="overview" :period="period" :scale="scopeShare" :tanks="scopeTanks" :is-finance-shown="isFinanceShown" />
      <production-tab v-else-if="tab === 'production'" key="production" :scale="scopeShare" :period="period" :tanks="scopeTanks" />
      <finance-tab v-else-if="tab === 'finance'" key="finance" :scale="scopeShare" :period="period" />
      <clients-tab v-else-if="tab === 'clients'" key="clients" :is-finance-shown="isFinanceShown" :period="period" />
      <div v-else key="tanks">
        <div class="hidden md:block"><tank-gantt :tanks="scopeTanks" :period="period" /></div>
        <tank-planning-cards class="md:hidden" :tanks="scopeTanks" :period="period" />
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — chosen Management Home (ticket 0019) with the v2 tabs (tickets 0028, 0029, 0031) and a global period. Mock figures only.
// imports
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { SITE_FIGURES, TANKS } from 'dashboard/prototype/mock-home.prototype';
import { PERIODS, usePeriod } from 'dashboard/prototype/use-period.prototype';

import ClientsTab from 'dashboard/prototype/clients-tab.prototype.vue';
import FinanceTab from 'dashboard/prototype/finance-tab.prototype.vue';
import OverviewTab from 'dashboard/prototype/overview-tab.prototype.vue';
import ProductionTab from 'dashboard/prototype/production-tab.prototype.vue';
import SegmentedControl from 'dashboard/prototype/segmented-control.prototype.vue';
import TankGantt from 'dashboard/prototype/tank-gantt.prototype.vue';
import TankPlanningCards from 'dashboard/prototype/tank-planning-cards.prototype.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const route = useRoute();
const router = useRouter();
const { period, selectPeriod } = usePeriod();

// variables
type HomeTab = 'overview' | 'production' | 'finance' | 'clients' | 'tanks';
const TABS: { key: HomeTab; label: string; isFinance?: boolean }[] = [
  { key: 'overview', label: 'Vue d’ensemble' },
  { key: 'production', label: 'Production' },
  { key: 'finance', label: 'Finances', isFinance: true },
  { key: 'clients', label: 'Clients' },
  { key: 'tanks', label: 'Planning cuves' },
];
const totalRevenue = SITE_FIGURES.reduce((sum, site) => sum + site.revenueSeason, 0);

// computed
const isFinanceShown = computed((): boolean => authStore.can('finance.view'));
const visibleTabs = computed(() => TABS.filter((item) => !item.isFinance || isFinanceShown.value));
const tab = computed((): HomeTab => {
  const key = String(route.query.tab ?? 'overview');
  return visibleTabs.value.find((item) => item.key === key)?.key ?? 'overview';
});
const scopeSites = computed(() => (siteStore.isAllSites ? SITE_FIGURES : SITE_FIGURES.filter((site) => site.siteId === siteStore.currentSiteId)));
const scopeName = computed((): string => (siteStore.isAllSites ? 'Tous les sites' : (siteStore.currentSite?.name ?? '')));
const scopeShare = computed((): number => scopeSites.value.reduce((sum, site) => sum + site.revenueSeason, 0) / totalRevenue || 1);
const scopeTanks = computed(() => (siteStore.isAllSites ? TANKS : TANKS.filter((tank) => tank.siteId === siteStore.currentSiteId)));

// event handlers
const handleTab = (key: HomeTab): void => {
  router.replace({ query: { ...route.query, tab: key === 'overview' ? undefined : key } });
};
</script>
