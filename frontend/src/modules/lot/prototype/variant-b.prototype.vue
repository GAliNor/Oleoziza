<template>
  <!-- PROTOTYPE: board view (ticket 0036): one column per Lot status; a card slides the board out for the Lot. -->
  <p v-show="!isOpen" class="rise body-two">Les lots retirés montrent les 6 derniers ; cherchez pour les plus anciens.</p>

  <div class="flex min-w-0 gap-4 overflow-hidden">
    <div class="w-full shrink-0 transition-[margin,width] duration-500 ease-(--ease-premium)" :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }">
      <div class="flex snap-x gap-3 overflow-x-auto pb-3">
        <section
          v-for="column in columns"
          :key="column.key"
          class="flex w-72 shrink-0 snap-start flex-col gap-2 rounded-2xl bg-subtle/70 p-3"
        >
          <header class="flex items-center justify-between px-1">
            <h2 class="heading-six">{{ column.label }}</h2>
            <span class="chip bg-surface text-fg-primary-paragraph tabular-nums">{{ column.total }}</span>
          </header>
          <button
            v-for="lot in column.lots"
            :key="lot.id"
            type="button"
            class="flex flex-col gap-1 rounded-xl border border-default bg-surface p-3 text-left shadow-raised transition duration-300 ease-(--ease-premium) hover:-translate-y-0.5 hover:shadow-raised"
            @click="handleOpen(lot.id)"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="font-semibold text-fg-display">{{ lot.code }}</span>
              <span class="body-three">{{ formatDate(lot.receivedAt) }}</span>
            </span>
            <span class="truncate body-two text-fg-default">{{ lot.client }}</span>
            <span class="body-three tabular-nums">
              {{ formatQuintals(lot.netKg) }}
              <template v-if="lot.oilKg"> · {{ formatOilKg(lot.oilKg) }} · {{ formatYield(lot.oilKg, lot.netKg) }}</template>
            </span>
          </button>
          <p v-if="!column.lots.length" class="px-1 py-4 text-center body-two">—</p>
        </section>
      </div>
    </div>

    <aside v-if="active" class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)" :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'" :aria-hidden="!isOpen">
      <button type="button" class="btn-secondary self-start" @click="handleClose">← Retour au tableau</button>
      <lot-detail :key="active.id" :lot="active" />
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
import { formatQuintals, formatOilKg, formatYield } from 'lot/composables/quantity';
import { formatTime, formatShortDate, todayIso, toIsoDate } from 'global/composables/date';

import LotDetail from 'lot/prototype/lot-detail.prototype.vue';

// props
const props = defineProps<{ search: string }>();

// stores
const route = useRoute();
const router = useRouter();
const { scoped, find } = useLotsPrototype();

// variables
const WITHDRAWN_SHOWN = 6;
const lastId = ref<string | null>(null);

// computed
const matching = computed((): ILotRecordPrototype[] => {
  const query = props.search.trim().toLowerCase();
  return scoped.value.filter((lot) => lot.code.toLowerCase().includes(query) || lot.client.toLowerCase().includes(query));
});
const columns = computed(() => {
  return LOT_STATUSES.map((key) => {
    const all = matching.value.filter((lot) => lot.status === key);
    const lots = key === 'withdrawn' && !props.search ? all.slice(0, WITHDRAWN_SHOWN) : [...all].reverse();
    return { key, label: STATUS_LABELS[key], lots, total: all.length };
  });
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
const formatDate = (iso: string): string => (toIsoDate(iso) === todayIso() ? formatTime(iso) : formatShortDate(iso));

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, lot: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, lot: undefined } });
};
</script>
