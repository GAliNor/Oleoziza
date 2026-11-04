<template>
  <!-- PROTOTYPE: table view (ticket 0036): the app's register table with status chips; a row slides the table out for the Lot. -->
  <div v-show="!isOpen" class="rise flex flex-col gap-3">
    <div class="no-scrollbar flex gap-2 overflow-x-auto">
      <button type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === 'all' }" @click="status = 'all'">Tous <span class="text-fg-muted tabular-nums">{{ scoped.length }}</span></button>
      <button v-for="key in LOT_STATUSES" :key="key" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === key }" @click="status = key">
        {{ STATUS_LABELS[key] }} <span class="text-fg-muted tabular-nums">{{ countOf(key) }}</span>
      </button>
    </div>
  </div>

  <ui-master-detail :is-open="isOpen" back-label="Retour aux lots" @close="handleClose">
    <template #list>
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th class="px-4 py-3 font-semibold">Lot</th>
              <th class="px-4 py-3 font-semibold">Client</th>
              <th class="hidden px-4 py-3 font-semibold lg:table-cell">Variété</th>
              <th class="px-4 py-3 text-right font-semibold">Olives</th>
              <th class="hidden px-4 py-3 text-right font-semibold md:table-cell">Huile</th>
              <th class="hidden px-4 py-3 text-right font-semibold md:table-cell">Rendement</th>
              <th class="hidden px-4 py-3 font-semibold sm:table-cell">Statut</th>
            </tr>
          </thead>
          <tbody :key="`${page}-${status}-${search}`" class="stagger">
            <tr
              v-for="lot in pageRows"
              :key="lot.id"
              class="data-row"
              :class="{ 'bg-selected/40': lot.id === lastId }"
              tabindex="0"
              @click="handleOpen(lot.id)"
              @keydown.enter="handleOpen(lot.id)"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <p class="font-medium text-fg-display">{{ lot.code }}</p>
                <p class="body-two">{{ formatDateTime(lot.receivedAt) }}</p>
              </td>
              <td class="px-4 py-3 text-fg-display">{{ lot.client }}</td>
              <td class="hidden px-4 py-3 text-fg-primary-paragraph lg:table-cell">{{ lot.variety }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums">{{ formatKg(lot.netKg) }}</td>
              <td class="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums md:table-cell">{{ lot.oilKg ? `${formatKg(lot.oilKg)}` : '—' }}</td>
              <td class="hidden px-4 py-3 text-right tabular-nums md:table-cell">{{ lot.oilKg ? formatYield(lot.oilKg, lot.netKg) : '—' }}</td>
              <td class="hidden px-4 py-3 sm:table-cell"><span class="chip bg-subtle text-fg-primary-paragraph">{{ STATUS_LABELS[lot.status] }}</span></td>
            </tr>
          </tbody>
        </table>
        <ui-empty-state v-if="!rows.length" message="Aucun lot" />
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
import { useRoute, useRouter } from 'vue-router';

import { usePagedRows } from 'global/composables/use-paged-rows';
import { LOT_STATUSES, STATUS_LABELS, type LotStatus } from 'dashboard/prototype/mock-home.prototype';
import type { ILotRecordPrototype } from 'lot/prototype/mock-lots.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';
import { formatKg, formatYield } from 'lot/composables/quantity';
import { formatDateTime } from 'global/composables/date';

import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import LotDetail from 'lot/prototype/lot-detail.prototype.vue';

// props
const props = defineProps<{ search: string }>();

// stores
const route = useRoute();
const router = useRouter();
const { scoped, find } = useLotsPrototype();

// variables
const PAGE_SIZE = 10;
const status = ref<LotStatus | 'all'>('all');
const lastId = ref<string | null>(null);

// computed
const rows = computed((): ILotRecordPrototype[] => {
  const query = props.search.trim().toLowerCase();
  return scoped.value.filter(
    (lot) =>
      (status.value === 'all' || lot.status === status.value) &&
      (lot.code.toLowerCase().includes(query) || lot.client.toLowerCase().includes(query)),
  );
});
const { page, pageCount, pageRows } = usePagedRows(rows, PAGE_SIZE);
const openId = computed((): string | null => (typeof route.query.lot === 'string' ? route.query.lot : null));
const isOpen = computed((): boolean => find(openId.value) !== undefined);
const active = computed((): ILotRecordPrototype | undefined => find(openId.value ?? lastId.value));

// watchers
watch([() => props.search, status], () => {
  page.value = 1;
});
watch(
  openId,
  (id) => {
    if (id) lastId.value = id;
  },
  { immediate: true },
);

// methods
const countOf = (key: LotStatus): number => scoped.value.filter((lot) => lot.status === key).length;

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, lot: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, lot: undefined } });
};
</script>
