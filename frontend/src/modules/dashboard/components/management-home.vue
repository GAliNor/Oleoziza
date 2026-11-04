<template>
  <section class="mx-auto flex max-w-6xl min-w-0 flex-col gap-5">
    <div class="rise mb-1 flex flex-wrap items-end justify-between gap-2">
      <div class="flex flex-col gap-1.5">
        <h1 class="heading-one">{{ $t('dashboard.welcome', { name: sessionStore.salutation }) }}</h1>
        <p class="body-two">{{ scopeName }}</p>
      </div>
      <p v-if="!isFinanceShown" class="chip bg-subtle text-fg-primary-paragraph">{{ $t('dashboard.management.financeHidden') }}</p>
    </div>

    <div class="rise flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <ui-segmented :model-value="tab" :options="visibleTabs" variant="strong-pills" :label="$t('dashboard.management.sections')" @update:model-value="handleTab" />
      <ui-segmented :model-value="period.key" :options="periodOptions" :label="$t('global.period.label')" @update:model-value="selectPeriod" />
    </div>

    <ui-empty-state v-if="dashboardStore.hasError" class="card" tone="danger" size="compact" :message="$t('dashboard.management.loadError')">
      <template #action>
        <button type="button" class="btn-secondary" @click="load">{{ $t('dashboard.management.retry') }}</button>
      </template>
    </ui-empty-state>
    <div v-else-if="!dashboard" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="index in 8" :key="index" class="skeleton h-28 rounded-2xl" />
    </div>
    <Transition v-else name="tab-switch" mode="out-in">
      <overview-tab v-if="tab === 'overview'" key="overview" :period="period" :dashboard="dashboard" :is-finance-shown="isFinanceShown" />
      <production-tab v-else-if="tab === 'production'" key="production" :period="period" :dashboard="dashboard" />
      <finance-tab v-else-if="tab === 'finance'" key="finance" :period="period" />
      <div v-else key="tanks">
        <div class="hidden md:block"><tank-gantt :tanks="dashboard.tanks" :storage="dashboard.tankStorage" :period="period" /></div>
        <tank-planning-cards class="md:hidden" :tanks="dashboard.tanks" :storage="dashboard.tankStorage" :period="period" />
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useDashboardStore } from 'dashboard/stores/dashboard';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { usePeriod } from 'global/composables/use-period';
import { useSiteScope } from 'site/composables/use-site-scope';

import FinanceTab from 'dashboard/components/finance-tab.vue';
import OverviewTab from 'dashboard/components/overview-tab.vue';
import ProductionTab from 'dashboard/components/production-tab.vue';
import TankGantt from 'dashboard/components/tank-gantt.vue';
import TankPlanningCards from 'dashboard/components/tank-planning-cards.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';

// stores
const { t } = useI18n();
const dashboardStore = useDashboardStore();
const financeStore = useFinanceStore();
const lotStore = useLotStore();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const route = useRoute();
const router = useRouter();
const { period, periodOptions, selectPeriod } = usePeriod();
const { scopeName } = useSiteScope();

// variables
type HomeTab = 'overview' | 'production' | 'finance' | 'tanks';
const TABS: { key: HomeTab; isFinance?: boolean }[] = [{ key: 'overview' }, { key: 'production' }, { key: 'finance', isFinance: true }, { key: 'tanks' }];

// computed
const dashboard = computed(() => dashboardStore.dashboard);
const isFinanceShown = computed((): boolean => siteStore.can('finance.view'));
const visibleTabs = computed(() => TABS.filter((item) => !item.isFinance || isFinanceShown.value).map((item) => ({ key: item.key, label: t(`dashboard.management.tabs.${item.key}`) })));
const tab = computed((): HomeTab => {
  const key = String(route.query.tab ?? 'overview');
  return visibleTabs.value.find((item) => item.key === key)?.key ?? 'overview';
});

// methods
const load = (): void => {
  const siteId = siteStore.currentSiteId;
  if (!siteId) return;
  dashboardStore.fetchDashboard(siteId, period.value.key);
  lotStore.fetchLots(siteId);
  if (isFinanceShown.value) financeStore.load(siteId, period.value.key);
};

// watchers
watch([() => siteStore.currentSiteId, () => period.value.key], load, { immediate: true });

// event handlers
const handleTab = (key: HomeTab): void => {
  router.replace({ query: { ...route.query, tab: key === 'overview' ? undefined : key } });
};
</script>
