<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">{{ $t('finance.page.title') }}</h1>
          <p class="body-two">{{ $t('finance.page.subtitle', { scope: scopeName }) }}</p>
        </div>
        <ui-segmented :model-value="period.key" :options="periodOptions" :label="$t('global.period.label')" @update:model-value="selectPeriod" />
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('finance.page.readOnly') }}</p>

      <ui-empty-state v-if="financeStore.hasError" class="card" tone="danger" size="compact" :message="$t('finance.page.loadError')">
        <template #action>
          <button type="button" class="btn-secondary" @click="reload">{{ $t('finance.page.retry') }}</button>
        </template>
      </ui-empty-state>
      <div v-else-if="!financeStore.sales" class="flex flex-col gap-3">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div v-for="index in 4" :key="index" class="skeleton h-28 rounded-2xl" />
        </div>
        <div v-for="index in 5" :key="index" class="skeleton h-14 rounded-xl" />
      </div>
      <movement-register v-else />
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { useFinanceStore } from 'finance/stores/finance';
import { useSiteStore } from 'site/stores/site';
import { useFinanceLoader } from 'finance/composables/use-finance';
import { usePeriod } from 'global/composables/use-period';
import { useSiteScope } from 'site/composables/use-site-scope';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import MovementRegister from 'finance/components/movement-register.vue';

// stores
const financeStore = useFinanceStore();
const siteStore = useSiteStore();
const { period, periodOptions, selectPeriod } = usePeriod();
const { scopeName } = useSiteScope();
const { reload } = useFinanceLoader();
</script>
