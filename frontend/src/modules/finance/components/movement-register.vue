<template>
  <sales-tiles v-if="figures" v-show="!isOpen" class="rise" :figures="figures" :period-label="period.label" can-open-pending :is-active="tab === 'pending'" @pending="handleTab('pending')" />

  <div v-show="!isOpen" class="rise flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <input v-model="search" class="input md:max-w-xs" type="search" :placeholder="$t('finance.register.search')" />
    <ui-segmented class="shrink-0 self-start md:self-auto" variant="tabs" :model-value="tab" :options="tabOptions" :label="$t('finance.register.tabsLabel')" @update:model-value="handleTab">
      <template #option="{ option }">
        {{ option.label }}
        <span v-if="option.key === 'pending'" class="chip ml-1 bg-warning-subtle text-fg-warning">{{ pending.length }}</span>
      </template>
    </ui-segmented>
  </div>

  <ui-master-detail :is-open="isOpen" :back-label="$t('finance.register.back')" @close="handleClose">
    <template #list>
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th class="px-4 py-3 font-semibold">{{ $t('finance.register.columns.date') }}</th>
              <th class="px-4 py-3 font-semibold">{{ $t('finance.register.columns.client') }}</th>
              <th class="hidden px-4 py-3 font-semibold lg:table-cell">{{ $t('finance.register.columns.label') }}</th>
              <th class="hidden px-4 py-3 font-semibold md:table-cell">{{ $t('finance.register.columns.method') }}</th>
              <th class="hidden px-4 py-3 font-semibold xl:table-cell">{{ $t('finance.register.columns.recordedBy') }}</th>
              <th class="px-4 py-3 text-right font-semibold">{{ $t('finance.register.columns.amount') }}</th>
              <th class="hidden px-4 py-3 font-semibold sm:table-cell">{{ $t('finance.register.columns.status') }}</th>
            </tr>
          </thead>
          <tbody :key="`${tab}-${page}-${search}`" class="stagger">
            <tr
              v-for="movement in pageRows"
              :key="movement.id"
              class="data-row"
              :class="{ 'bg-selected/40': movement.id === lastId }"
              tabindex="0"
              @click="handleOpen(movement.id)"
              @keydown.enter="handleOpen(movement.id)"
            >
              <td class="px-4 py-3 whitespace-nowrap text-fg-primary-paragraph">{{ formatDateTime(movement.recordedAt) }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-fg-display">{{ movement.client }}</p>
                <p class="body-two">{{ movement.code }}<span class="lg:hidden"> · {{ $t(`finance.purposes.${movement.purpose}`) }}</span></p>
              </td>
              <td class="hidden px-4 py-3 text-fg-primary-paragraph lg:table-cell">{{ movement.label }}</td>
              <td class="hidden px-4 py-3 whitespace-nowrap md:table-cell">
                {{ $t(`finance.methods.${movement.method}`) }}
                <span v-if="movement.proofUrl" class="chip ml-1 bg-subtle text-fg-primary-paragraph">{{ $t('finance.register.photo') }}</span>
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph xl:table-cell">{{ movement.recordedBy }}</td>
              <td class="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums" :class="movement.kind === 'payment' ? 'text-fg-brand' : 'text-fg-accent'">
                {{ movement.kind === 'payment' ? '+' : '−' }}{{ formatMoney(movement.amount) }}
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap sm:table-cell"><span class="chip" :class="MOVEMENT_STATUS_TONES[movement.status]">{{ $t(`finance.statuses.${movement.status}`) }}</span></td>
            </tr>
          </tbody>
        </table>
        <ui-empty-state v-if="!rows.length" :message="$t(tab === 'pending' ? 'finance.register.emptyPending' : 'finance.register.emptyAll')" />
      </div>
      <ui-pagination v-model:page="page" :page-count="pageCount" :total="rows.length" :page-size="PAGE_SIZE" />
    
    </template>
    <template v-if="nextPendingId" #actions>
      <button type="button" class="link ml-auto" @click="handleOpen(nextPendingId)">{{ $t('finance.register.nextPending') }}</button>
    </template>
    <template v-if="active" #detail>
      <movement-detail :key="active.id" class="max-w-4xl" :movement="active" />
    
    </template>
  </ui-master-detail>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { usePagedRows } from 'global/composables/use-paged-rows';
import { useFinanceStore } from 'finance/stores/finance';
import { useFinance } from 'finance/composables/use-finance';
import { MOVEMENT_STATUS_TONES } from 'finance/constants/finance';
import type { IMovement } from 'finance/types/finance';
import { formatMoney } from 'global/composables/money';
import { formatDateTime } from 'global/composables/date';

import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import SalesTiles from 'finance/components/sales-tiles.vue';
import MovementDetail from 'finance/components/movement-detail.vue';

// stores
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const financeStore = useFinanceStore();
const { inPeriod, pending, figures, period } = useFinance();

// variables
const PAGE_SIZE = 10;
type RegisterTab = 'pending' | 'all';
const search = ref('');
const lastId = ref<string | null>(null);

// methods
const find = (id: string | null): IMovement | undefined => financeStore.movements.find((movement) => movement.id === id);

// computed
const tabOptions = computed((): { key: RegisterTab; label: string }[] => [
  { key: 'pending', label: t('finance.register.tabs.pending') },
  { key: 'all', label: t('finance.register.tabs.all') },
]);
const tab = computed((): RegisterTab => (route.query.tab === 'all' ? 'all' : 'pending'));
const rows = computed((): IMovement[] => {
  const query = search.value.trim().toLowerCase();
  return (tab.value === 'pending' ? pending.value : inPeriod.value).filter(
    (movement) =>
      [movement.client, movement.code, movement.reference ?? '', movement.label].some((value) => value.toLowerCase().includes(query)),
  );
});
const { page, pageCount, pageRows } = usePagedRows(rows, PAGE_SIZE);
const openId = computed((): string | null => (typeof route.query.movement === 'string' ? route.query.movement : null));
const isOpen = computed((): boolean => find(openId.value) !== undefined);
const active = computed((): IMovement | undefined => find(openId.value ?? lastId.value));
const nextPendingId = computed((): string | null => pending.value.find((movement) => movement.id !== openId.value)?.id ?? null);

// watchers
watch([search, tab], () => {
  page.value = 1;
});
watch(
  openId,
  (id) => {
    if (id) lastId.value = id;
  },
  { immediate: true },
);

// event handlers
const handleTab = (key: RegisterTab): void => {
  router.replace({ query: { ...route.query, tab: key === 'pending' ? undefined : key, movement: undefined } });
};

const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, movement: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, movement: undefined } });
};
</script>
