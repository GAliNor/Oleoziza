<template>
  <!-- PROTOTYPE: variant A (ticket 0036): the app's register table with status chips and an « à vérifier » banner; a row slides the table out for the Lot, corrections in a side panel. -->
  <button
    v-if="toReview.length && !isOpen"
    type="button"
    class="rise card flex items-center gap-3 rounded-2xl border-danger-red/30 bg-danger-red/5 text-left transition hover:bg-danger-red/10"
    @click="status = status === 'review' ? 'all' : 'review'"
  >
    <span class="avatar h-9 w-9 bg-danger-red/15 text-danger-red">!</span>
    <span class="flex-1">
      <span class="block font-semibold text-neutral-900">{{ toReview.length }} lot(s) à vérifier</span>
      <span class="block body-two">Saisies hors ligne en conflit ou faites sans le droit</span>
    </span>
    <span class="text-sm font-medium text-danger-red">{{ status === 'review' ? 'Tout afficher' : 'Voir' }} →</span>
  </button>

  <div v-show="!isOpen" class="rise flex flex-col gap-3">
    <div class="flex flex-col gap-3 md:flex-row md:items-center">
      <input v-model="search" class="input md:max-w-xs" type="search" placeholder="N° de lot ou Client" />
      <div class="flex flex-wrap gap-2">
        <button v-for="(label, key) in MODES" :key="key" type="button" class="choice-chip" :class="{ 'choice-chip-active': mode === key }" @click="mode = key">{{ label }}</button>
      </div>
    </div>
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
          <tbody :key="`${page}-${status}-${mode}-${search}`" class="stagger">
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
                <p class="font-medium text-neutral-900">
                  {{ lot.code }}
                  <span v-if="lot.review" class="ml-1 inline-block h-2 w-2 rounded-full bg-danger-red" title="À vérifier" />
                </p>
                <p class="body-two">{{ formatDate(lot.receivedAt) }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="text-neutral-900">{{ lot.client }}</p>
                <p class="body-two">
                  {{ lot.mode === 'service' ? 'Façon' : 'Achat' }}
                  <span v-if="lot.corrections.length" class="chip ml-1 bg-accent-sand/30 text-accent-brown">corrigé</span>
                </p>
              </td>
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
      <lot-detail :key="active.id" :lot="active" correction-style="panel" />
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

// stores
const route = useRoute();
const router = useRouter();
const { scoped, toReview, find } = useLotsPrototype();

// variables
const PAGE_SIZE = 10;
const MODES = { all: 'Tous', service: 'Façon', purchase: 'Achat' } as const;
const search = ref('');
const status = ref<LotStatus | 'all' | 'review'>('all');
const mode = ref<keyof typeof MODES>('all');
const page = ref(1);
const lastId = ref<string | null>(null);

// computed
const rows = computed((): ILotRecordPrototype[] => {
  const query = search.value.trim().toLowerCase();
  return scoped.value.filter(
    (lot) =>
      (status.value === 'all' || (status.value === 'review' ? lot.review : lot.status === status.value)) &&
      (mode.value === 'all' || lot.mode === mode.value) &&
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
watch([search, status, mode], () => {
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
