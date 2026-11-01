<template>
  <!-- PROTOTYPE: table view (ticket 0036): the app's register table with status chips; a row slides the table out for the Lot. -->
  <div v-show="!isOpen" class="rise flex flex-col gap-3">
    <div class="no-scrollbar flex gap-2 overflow-x-auto">
      <button type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === 'all' }" @click="status = 'all'">Tous <span class="text-neutral-400 tabular-nums">{{ scoped.length }}</span></button>
      <button v-for="key in LOT_STATUSES" :key="key" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': status === key }" @click="status = key">
        {{ STATUS_LABELS[key] }} <span class="text-neutral-400 tabular-nums">{{ countOf(key) }}</span>
      </button>
    </div>
  </div>

  <div class="flex min-w-0 gap-4 overflow-hidden">
    <div class="flex w-full shrink-0 flex-col gap-3 transition-[margin,width] duration-500 ease-(--ease-premium)" :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }">
      <div class="card min-w-0 overflow-x-auto rounded-2xl p-0">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
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
              class="cursor-pointer border-t border-neutral-100 transition-colors hover:bg-neutral-50"
              :class="{ 'bg-primary-olive-light/40': lot.id === lastId }"
              tabindex="0"
              @click="handleOpen(lot.id)"
              @keydown.enter="handleOpen(lot.id)"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <p class="font-medium text-neutral-900">{{ lot.code }}</p>
                <p class="body-two">{{ formatDate(lot.receivedAt) }}</p>
              </td>
              <td class="px-4 py-3 text-neutral-900">{{ lot.client }}</td>
              <td class="hidden px-4 py-3 text-neutral-700 lg:table-cell">{{ lot.variety }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums">{{ lot.netKg.toLocaleString('fr-FR') }} kg</td>
              <td class="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums md:table-cell">{{ lot.oilKg ? `${lot.oilKg.toLocaleString('fr-FR')} kg` : '—' }}</td>
              <td class="hidden px-4 py-3 text-right tabular-nums md:table-cell">{{ lot.oilKg ? `${((lot.oilKg / lot.netKg) * 100).toFixed(1).replace('.', ',')} %` : '—' }}</td>
              <td class="hidden px-4 py-3 sm:table-cell"><span class="chip bg-neutral-100 text-neutral-700">{{ STATUS_LABELS[lot.status] }}</span></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!rows.length" class="body-two px-5 py-8 text-center">Aucun lot</p>
      </div>
      <nav v-if="pageCount > 1" class="flex items-center justify-between gap-3" aria-label="Pages">
        <p class="body-two tabular-nums">{{ firstIndex + 1 }}–{{ firstIndex + pageRows.length }} sur {{ rows.length }}</p>
        <div class="flex items-center gap-1">
          <button v-for="number in pageCount" :key="number" type="button" class="h-9 min-w-9 rounded-lg px-2 text-sm tabular-nums" :class="number === page ? 'bg-primary-olive-dark text-white' : 'text-neutral-600 hover:bg-neutral-100'" @click="page = number">
            {{ number }}
          </button>
        </div>
      </nav>
    </div>

    <aside v-if="active" class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)" :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'" :aria-hidden="!isOpen">
      <button type="button" class="btn-secondary self-start" @click="handleClose">← Retour aux lots</button>
      <lot-detail :key="active.id" :lot="active" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { LOT_STATUSES, STATUS_LABELS, type LotStatus } from 'dashboard/prototype/mock-home.prototype';
import type { ILotRecordPrototype } from 'lot/prototype/mock-lots.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

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
const page = ref(1);
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
const pageCount = computed((): number => Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)));
const firstIndex = computed((): number => (page.value - 1) * PAGE_SIZE);
const pageRows = computed((): ILotRecordPrototype[] => rows.value.slice(firstIndex.value, firstIndex.value + PAGE_SIZE));
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
const formatDate = (iso: string): string => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, lot: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, lot: undefined } });
};
</script>
