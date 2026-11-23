<template>
  <div v-show="!isOpen" class="rise flex flex-col gap-3">
    <div class="no-scrollbar flex gap-2 overflow-x-auto">
      <button type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === 'all' }" @click="status = 'all'">
        {{ $t('lot.register.all') }} <span class="text-fg-muted tabular-nums">{{ scoped.length }}</span>
      </button>
      <button v-for="key in LOT_STATUSES" :key="key" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === key }" @click="status = key">
        {{ $t(`lot.status.${key}`) }} <span class="text-fg-muted tabular-nums">{{ countOf(key) }}</span>
      </button>
      <button type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === 'without-line' }" @click="status = 'without-line'">
        {{ $t('lot.withoutLine.title') }} <span class="text-fg-muted tabular-nums">{{ lotStore.withoutLine.total }}</span>
      </button>
    </div>
  </div>

  <ui-master-detail :is-open="isOpen" :back-label="$t(fromClientId ? 'lot.register.backToClient' : 'lot.register.backToLots')" @close="closeLot">
    <template #list>
      <lots-without-line v-if="status === 'without-line' && siteStore.currentSiteId" :site-id="siteStore.currentSiteId" :can-assign="!siteStore.isAllSites && siteStore.can('reception.create')" :search="search" @open="handleOpenWithoutLine" />
      <div v-else class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th class="px-4 py-3 font-semibold">{{ $t('lot.register.columns.lot') }}</th>
              <th class="px-4 py-3 font-semibold">{{ $t('lot.register.columns.client') }}</th>
              <th class="hidden px-4 py-3 font-semibold lg:table-cell">{{ $t('lot.register.columns.variety') }}</th>
              <th class="px-4 py-3 text-end font-semibold">{{ $t('lot.register.columns.olives') }}</th>
              <th class="hidden px-4 py-3 text-end font-semibold md:table-cell">{{ $t('lot.register.columns.oil') }}</th>
              <th class="hidden px-4 py-3 text-end font-semibold md:table-cell">{{ $t('lot.register.columns.yield') }}</th>
              <th class="hidden px-4 py-3 font-semibold sm:table-cell">{{ $t('lot.register.columns.status') }}</th>
            </tr>
          </thead>
          <tbody :key="`${page}-${status}-${search}`" class="stagger">
            <tr
              v-for="lot in pageRows"
              :key="lot.id"
              class="data-row"
              :class="{ 'bg-selected/40': lot.id === lastId }"
              tabindex="0"
              @click="openLot(lot.id)"
              @keydown.enter="openLot(lot.id)"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <p class="font-medium text-fg-display">{{ lot.code }}</p>
                <p class="body-two">{{ formatDateTime(lot.receivedAt) }}</p>
              </td>
              <td class="px-4 py-3 text-fg-display">{{ lot.clientName }}</td>
              <td class="hidden px-4 py-3 text-fg-primary-paragraph lg:table-cell">{{ lot.variety }}</td>
              <td class="px-4 py-3 text-end whitespace-nowrap tabular-nums">{{ formatKg(lot.netKg) }}</td>
              <td class="hidden px-4 py-3 text-end whitespace-nowrap tabular-nums md:table-cell">{{ lot.oilLitres ? formatLitres(lot.oilLitres) : '—' }}</td>
              <td class="hidden px-4 py-3 text-end tabular-nums md:table-cell">{{ lot.oilLitres ? formatYield(lot.oilLitres, lot.netKg) : '—' }}</td>
              <td class="hidden px-4 py-3 sm:table-cell">
                <span class="flex flex-wrap gap-1">
                  <span class="chip bg-subtle text-fg-primary-paragraph">{{ $t(`lot.status.${lot.status}`) }}</span>
                  <lot-payment-chip :lot="lot" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <ui-empty-state v-if="!rows.length" :message="$t('lot.register.empty')" />
      </div>
      <ui-pagination v-if="status !== 'without-line'" v-model:page="page" :page-count="pageCount" :total="rows.length" :page-size="PAGE_SIZE" />
    </template>
    <template v-if="active" #detail>
      <lot-detail :key="active.id" :lot="active" />
      <lot-actions :key="`actions-${active.id}`" :lot="active" />
    </template>
  </ui-master-detail>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { useLotRegister, useOpenLot } from 'lot/composables/use-lot-register';
import { usePagedRows } from 'global/composables/use-paged-rows';
import { formatKg, formatLitres, formatYield } from 'lot/composables/quantity';
import { formatDateTime } from 'global/composables/date';
import { LOT_STATUSES } from 'lot/constants/lot';
import type { ILot, LotStatus } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import LotDetail from 'lot/components/lot-detail.vue';
import LotActions from 'lot/components/lot-actions.vue';
import LotsWithoutLine from 'lot/components/lots-without-line.vue';
import LotPaymentChip from 'lot/components/lot-payment-chip.vue';

// props
const props = defineProps<{ search: string }>();

// stores
const lotStore = useLotStore();
const siteStore = useSiteStore();
const { scoped } = useLotRegister();
const { isOpen, active, lastId, fromClientId, openLot, closeLot } = useOpenLot();

// variables
const PAGE_SIZE = 10;
const status = ref<LotStatus | 'all' | 'without-line'>('all');

// computed
const rows = computed((): ILot[] => {
  const query = props.search.trim().toLowerCase();
  return scoped.value.filter((lot) => (status.value === 'all' || lot.status === status.value) && (lot.code.toLowerCase().includes(query) || lot.clientName.toLowerCase().includes(query)));
});
const { page, pageCount, pageRows } = usePagedRows(rows, PAGE_SIZE);

// watchers
watch([() => props.search, status], () => {
  page.value = 1;
});

watch(
  () => siteStore.currentSiteId,
  (siteId) => {
    if (siteId) lotStore.fetchWithoutLine(siteId);
  },
  { immediate: true },
);

// methods
const countOf = (key: LotStatus): number => scoped.value.filter((lot) => lot.status === key).length;

// event handlers
const handleOpenWithoutLine = (lot: ILot): void => {
  if (!lotStore.lots.some((item) => item.id === lot.id)) lotStore.upsertLot(lot);
  openLot(lot.id);
};
</script>
