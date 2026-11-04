<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">{{ $t('lot.register.title') }}</h1>
          <p class="body-two">{{ $t('lot.register.subtitle', { scope: scopeName, period: period.noun, count: scoped.length }) }}</p>
        </div>
        <ui-segmented
          v-show="!isLotOpen"
          class="shrink-0 self-start md:self-auto"
          variant="tabs"
          :model-value="view"
          :options="viewOptions"
          :label="$t('lot.register.viewLabel')"
          @update:model-value="handleView"
        />
      </header>
      <div v-show="!isLotOpen" class="rise flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input v-model="search" class="input lg:max-w-xs" type="search" :placeholder="$t('lot.register.search')" />
        <ui-segmented class="self-start lg:self-auto" :model-value="period.key" :options="periodOptions" :label="$t('global.period.label')" @update:model-value="selectPeriod" />
      </div>

      <ui-empty-state v-if="lotStore.hasError" class="card" tone="danger" size="compact" :message="$t('lot.register.loadError')">
        <template #action>
          <button type="button" class="btn-secondary" @click="handleRetry">{{ $t('lot.register.retry') }}</button>
        </template>
      </ui-empty-state>
      <div v-else-if="lotStore.isLoading && !lotStore.lots.length" class="flex flex-col gap-2">
        <div v-for="index in 6" :key="index" class="skeleton h-14 rounded-xl" />
      </div>
      <lot-board v-else-if="view === 'board'" :search="search" />
      <lot-table v-else :search="search" />
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { useLotRegister } from 'lot/composables/use-lot-register';
import { usePeriod } from 'global/composables/use-period';
import { useSiteScope } from 'site/composables/use-site-scope';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import LotBoard from 'lot/components/lot-board.vue';
import LotTable from 'lot/components/lot-table.vue';

// stores
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const lotStore = useLotStore();
const siteStore = useSiteStore();
const { scoped } = useLotRegister();
const { period, periodOptions, selectPeriod } = usePeriod();
const { scopeName } = useSiteScope();

// variables
type RegisterView = 'table' | 'board';

const search = ref('');

// computed
const viewOptions = computed((): { key: RegisterView; label: string }[] => [
  { key: 'table', label: t('lot.register.views.table') },
  { key: 'board', label: t('lot.register.views.board') },
]);
const view = computed((): RegisterView => (route.query.view === 'board' ? 'board' : 'table'));
const isLotOpen = computed((): boolean => typeof route.query.lot === 'string');

// watchers
watch(
  () => siteStore.currentSiteId,
  (siteId) => {
    if (siteId) lotStore.fetchLots(siteId);
  },
  { immediate: true },
);

// event handlers
const handleView = (key: RegisterView): void => {
  router.replace({ query: { ...route.query, view: key === 'table' ? undefined : key } });
};

const handleRetry = (): void => {
  if (siteStore.currentSiteId) lotStore.fetchLots(siteStore.currentSiteId, true);
};
</script>
