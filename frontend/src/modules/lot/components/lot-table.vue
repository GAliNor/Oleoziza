<template>
  <div v-show="!isOpen" class="rise flex flex-col gap-3">
    <div class="no-scrollbar flex gap-2 overflow-x-auto">
      <button type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === 'all' }" @click="status = 'all'">
        {{ $t('lot.register.all') }} <span class="text-fg-muted tabular-nums">{{ scoped.length }}</span>
      </button>
      <button v-for="key in LOT_STATUSES" :key="key" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === key }" @click="status = key">
        {{ $t(`lot.status.${key}`) }} <span class="text-fg-muted tabular-nums">{{ countOf(key) }}</span>
      </button>
    </div>
  </div>

  <ui-master-detail :is-open="isOpen" :back-label="$t('lot.register.backToLots')" @close="closeLot">
    <template #list>
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th class="px-4 py-3 font-semibold">{{ $t('lot.register.columns.lot') }}</th>
              <th class="px-4 py-3 font-semibold">{{ $t('lot.register.columns.client') }}</th>
              <th class="hidden px-4 py-3 font-semibold lg:table-cell">{{ $t('lot.register.columns.variety') }}</th>
              <th class="px-4 py-3 text-right font-semibold">{{ $t('lot.register.columns.olives') }}</th>
              <th class="hidden px-4 py-3 text-right font-semibold md:table-cell">{{ $t('lot.register.columns.oil') }}</th>
              <th class="hidden px-4 py-3 text-right font-semibold md:table-cell">{{ $t('lot.register.columns.yield') }}</th>
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
              <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums">{{ formatKg(lot.netKg) }}</td>
              <td class="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums md:table-cell">{{ lot.oilKg ? formatKg(lot.oilKg) : '—' }}</td>
              <td class="hidden px-4 py-3 text-right tabular-nums md:table-cell">{{ lot.oilKg ? formatYield(lot.oilKg, lot.netKg) : '—' }}</td>
              <td class="hidden px-4 py-3 sm:table-cell"><span class="chip bg-subtle text-fg-primary-paragraph">{{ $t(`lot.status.${lot.status}`) }}</span></td>
            </tr>
          </tbody>
        </table>
        <ui-empty-state v-if="!rows.length" :message="$t('lot.register.empty')" />
      </div>
      <ui-pagination v-model:page="page" :page-count="pageCount" :total="rows.length" :page-size="PAGE_SIZE" />
    </template>
    <template v-if="active" #detail>
      <lot-detail :key="active.id" :lot="active" />
    </template>
  </ui-master-detail>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { useLotRegister, useOpenLot } from 'lot/composables/use-lot-register';
import { usePagedRows } from 'global/composables/use-paged-rows';
import { formatKg, formatYield } from 'lot/composables/quantity';
import { formatDateTime } from 'global/composables/date';
import { LOT_STATUSES } from 'lot/constants/lot';
import type { ILot, LotStatus } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import LotDetail from 'lot/components/lot-detail.vue';

// props
const props = defineProps<{ search: string }>();

// stores
const { scoped } = useLotRegister();
const { isOpen, active, lastId, openLot, closeLot } = useOpenLot();

// variables
const PAGE_SIZE = 10;
const status = ref<LotStatus | 'all'>('all');

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

// methods
const countOf = (key: LotStatus): number => scoped.value.filter((lot) => lot.status === key).length;
</script>
