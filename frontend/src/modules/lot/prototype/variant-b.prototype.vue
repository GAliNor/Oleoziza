<template>
  <!-- PROTOTYPE: variant B (ticket 0036): a board, one column per Lot status plus « À vérifier » first; a card slides the board out for the Lot. -->
  <div v-show="!isOpen" class="rise flex flex-col gap-3 md:flex-row md:items-center">
    <input v-model="search" class="input md:max-w-xs" type="search" placeholder="N° de lot ou Client" />
    <p class="body-two">Les lots retirés montrent les 6 derniers ; cherchez pour les plus anciens.</p>
  </div>

  <div class="flex min-w-0 gap-4 overflow-hidden">
    <div class="w-full shrink-0 transition-[margin,width] duration-500 ease-(--ease-premium)" :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }">
      <div class="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
        <section
          v-for="column in columns"
          :key="column.key"
          class="flex w-72 shrink-0 snap-start flex-col gap-2 rounded-2xl p-3"
          :class="column.key === 'review' ? 'bg-danger-red/5 ring-1 ring-danger-red/20' : 'bg-neutral-100/70'"
        >
          <header class="flex items-center justify-between px-1">
            <h2 class="text-sm font-semibold" :class="column.key === 'review' ? 'text-danger-red' : 'text-neutral-800'">{{ column.label }}</h2>
            <span class="chip bg-white text-neutral-600 tabular-nums">{{ column.total }}</span>
          </header>
          <button
            v-for="lot in column.lots"
            :key="lot.id"
            type="button"
            class="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition duration-300 ease-(--ease-premium) hover:-translate-y-0.5 hover:shadow-md"
            @click="handleOpen(lot.id)"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="font-semibold text-neutral-900">{{ lot.code }}</span>
              <span class="text-xs text-neutral-500">{{ formatDate(lot.receivedAt) }}</span>
            </span>
            <span class="truncate text-sm text-neutral-800">{{ lot.client }}</span>
            <span class="text-xs text-neutral-500 tabular-nums">
              {{ (lot.netKg / 100).toLocaleString('fr-FR') }} q
              <template v-if="lot.oilKg"> · {{ lot.oilKg.toLocaleString('fr-FR') }} kg huile · {{ ((lot.oilKg / lot.netKg) * 100).toFixed(1).replace('.', ',') }} %</template>
            </span>
            <span class="flex flex-wrap gap-1">
              <span v-if="lot.mode === 'purchase'" class="chip bg-accent-sand/25 text-accent-brown">Achat</span>
              <span v-if="lot.review" class="chip bg-danger-red/10 text-danger-red">{{ lot.review.kind === 'conflict' ? 'conflit hors ligne' : 'sans le droit' }}</span>
              <span v-if="lot.corrections.length" class="chip bg-accent-sand/30 text-accent-brown">corrigé</span>
            </span>
          </button>
          <p v-if="!column.lots.length" class="px-1 py-4 text-center body-two">—</p>
        </section>
      </div>
    </div>

    <aside v-if="active" class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)" :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'" :aria-hidden="!isOpen">
      <button type="button" class="btn-secondary self-start" @click="handleClose">← Retour au tableau</button>
      <lot-detail :key="active.id" :lot="active" correction-style="panel" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { LOT_STATUSES, STATUS_LABELS } from 'dashboard/prototype/mock-home.prototype';
import type { ILotRecordPrototype } from 'lot/prototype/mock-lots.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

import LotDetail from 'lot/prototype/lot-detail.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const { scoped, find } = useLotsPrototype();

// variables
const WITHDRAWN_SHOWN = 6;
const search = ref('');
const lastId = ref<string | null>(null);

// computed
const matching = computed((): ILotRecordPrototype[] => {
  const query = search.value.trim().toLowerCase();
  return scoped.value.filter((lot) => lot.code.toLowerCase().includes(query) || lot.client.toLowerCase().includes(query));
});
const columns = computed(() => {
  const review = matching.value.filter((lot) => lot.review);
  const byStatus = LOT_STATUSES.map((key) => {
    const all = matching.value.filter((lot) => lot.status === key && !lot.review);
    const lots = key === 'withdrawn' && !search.value ? all.slice(0, WITHDRAWN_SHOWN) : [...all].reverse();
    return { key, label: STATUS_LABELS[key], lots, total: all.length };
  });
  return review.length ? [{ key: 'review', label: 'À vérifier', lots: review, total: review.length }, ...byStatus] : byStatus;
});
const openId = computed((): string | null => (typeof route.query.lot === 'string' ? route.query.lot : null));
const isOpen = computed((): boolean => find(openId.value) !== undefined);
const active = computed((): ILotRecordPrototype | undefined => find(openId.value ?? lastId.value));

// watchers
watch(
  openId,
  (id) => {
    if (id) lastId.value = id;
  },
  { immediate: true },
);

// methods
const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return iso.startsWith('2026-10-24') ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, lot: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, lot: undefined } });
};
</script>
