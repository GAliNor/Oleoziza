<template>
  <section class="mx-auto flex max-w-6xl min-w-0 flex-col gap-5 pb-40">
    <div class="rise mb-1 flex flex-wrap items-end justify-between gap-2">
      <div class="flex flex-col gap-1.5">
        <h1 class="heading-one">{{ $t('dashboard.welcome', { name: sessionStore.salutation }) }}</h1>
        <p class="body-two">{{ scopeName }}</p>
      </div>
      <p v-if="!isFinanceShown" class="chip bg-subtle text-fg-primary-paragraph">{{ $t('dashboard.management.financeHidden') }}</p>
    </div>

    <!-- A block, not a flex column, so the Home floating out keeps its place while the Conversation takes it. -->
    <div class="relative min-w-0">
      <Transition name="home-recede">
        <div v-show="!isChatActive" class="flex min-w-0 flex-col gap-5">
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
            <div v-for="index in 8" :key="index" class="skeleton h-28 rounded-card" />
          </div>
          <Transition v-else name="tab-switch" mode="out-in">
            <overview-tab v-if="tab === 'overview'" key="overview" :period="period" :dashboard="dashboard" :is-finance-shown="isFinanceShown" />
            <production-tab v-else-if="tab === 'production'" key="production" :period="period" :dashboard="dashboard" />
            <finance-tab v-else-if="tab === 'finance'" key="finance" :period="period" />
          </Transition>
        </div>
      </Transition>

      <assistant-chat v-model:is-active="isChatActive" />
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useDashboardStore } from 'dashboard/stores/dashboard';
import { useExpenseStore } from 'expense/stores/expense';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { usePeriod } from 'global/composables/use-period';
import { useSiteScope } from 'site/composables/use-site-scope';

import FinanceTab from 'dashboard/components/finance-tab.vue';
import OverviewTab from 'dashboard/components/overview-tab.vue';
import ProductionTab from 'dashboard/components/production-tab.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
const AssistantChat = defineAsyncComponent(() => import('assistant/components/assistant-chat.vue'));

// stores
const { t } = useI18n();
const dashboardStore = useDashboardStore();
const financeStore = useFinanceStore();
const expenseStore = useExpenseStore();
const lotStore = useLotStore();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const route = useRoute();
const router = useRouter();
const { period, periodOptions, selectPeriod } = usePeriod();
const { scopeName } = useSiteScope();

// variables
type HomeTab = 'overview' | 'production' | 'finance';
const TABS: { key: HomeTab; isFinance?: boolean }[] = [{ key: 'overview' }, { key: 'production' }, { key: 'finance', isFinance: true }];
const isChatActive = ref(false);

// computed
const dashboard = computed(() => dashboardStore.dashboard);
const isFinanceShown = computed((): boolean => siteStore.can('finance.view'));
const visibleTabs = computed(() => TABS.filter((item) => !item.isFinance || isFinanceShown.value).map((item) => ({ key: item.key, label: t(`dashboard.management.tabs.${item.key}`) })));
const tab = computed((): HomeTab => {
  const key = String(route.query.tab ?? 'overview');
  return visibleTabs.value.find((item) => item.key === key)?.key ?? 'overview';
});

// methods
/** The Dashboard first: it carries the sales and Expense summary the tabs read, so these calls find them fresh and send nothing. */
const load = async (): Promise<void> => {
  const siteId = siteStore.currentSiteId;
  if (!siteId) return;
  lotStore.fetchLots(siteId);
  await dashboardStore.fetchDashboard(siteId, period.value.key);
  if (!isFinanceShown.value) return;
  financeStore.fetchSales(siteId, period.value.key);
  expenseStore.fetchSummary(siteId, period.value.key);
};

// watchers
watch([() => siteStore.currentSiteId, () => period.value.key], load, { immediate: true });

// event handlers
const handleTab = (key: HomeTab): void => {
  router.replace({ query: { ...route.query, tab: key === 'overview' ? undefined : key } });
};
</script>

<style scoped>
/* While the Home and the Conversation swap, the Home floats where it stands, so the two cross-fade in one place instead of stacking and then jumping. */
.home-recede-enter-active,
.home-recede-leave-active {
  position: absolute;
  inset-inline: 0;
  transform-origin: 50% 0;
}

.home-recede-enter-active {
  transition:
    opacity 0.5s var(--ease-premium) 0.08s,
    transform 0.7s var(--ease-glide) 0.08s,
    filter 0.5s var(--ease-premium) 0.08s;
}

.home-recede-leave-active {
  transition:
    opacity 0.32s var(--ease-premium),
    transform 0.45s var(--ease-premium),
    filter 0.32s var(--ease-premium);
}

.home-recede-enter-from,
.home-recede-leave-to {
  opacity: 0;
  transform: scale(0.965);
  filter: blur(8px);
}

@media (max-width: 47.99rem) {
  .home-recede-enter-from,
  .home-recede-leave-to {
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-recede-enter-active,
  .home-recede-leave-active {
    transition: none;
  }
}
</style>
