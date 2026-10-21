<template>
  <!-- PROTOTYPE: chosen Operator Home (variant C, ticket 0018): hero cards, then one flat list of Lots with their stage, narrowed by filters. -->
  <section class="mx-auto flex max-w-5xl flex-col gap-4">
    <div class="rise flex flex-col gap-1.5">
      <h1 class="heading-one">Bonjour {{ authStore.session?.firstName }}</h1>
      <p class="body-two">{{ visibleLots.length }} lots aujourd’hui · {{ pendingSyncCount }} à synchroniser</p>
    </div>

    <div class="stagger grid gap-3 md:grid-cols-2">
      <div class="lift rounded-3xl bg-primary-olive-dark p-5 text-white">
        <p class="text-xs font-semibold tracking-widest text-primary-olive-light uppercase">En pressage</p>
        <template v-if="lotsByStatus.pressing[0]">
          <p class="mt-1 text-2xl font-semibold">{{ lotsByStatus.pressing[0].client }}</p>
          <p class="text-primary-olive-light">{{ lotsByStatus.pressing[0].code }} · {{ formatKg(lotsByStatus.pressing[0].netKg) }} · depuis 11:15</p>
          <button type="button" class="mt-4 w-full rounded-xl bg-white py-3 font-medium text-primary-olive-dark" @click="handleQuickAdvance(lotsByStatus.pressing[0])">
            Saisir l’huile obtenue
          </button>
        </template>
        <p v-else class="mt-2 text-primary-olive-light">La ligne est libre.</p>
      </div>
      <div class="card lift flex flex-col justify-between gap-3 rounded-3xl p-5">
        <div>
          <p class="eyebrow">Prochain à presser</p>
          <template v-if="lotsByStatus.waiting[0]">
            <p class="mt-1 text-2xl font-semibold text-neutral-900">{{ lotsByStatus.waiting[0].client }}</p>
            <p class="body-two">{{ lotsByStatus.waiting[0].code }} · {{ formatKg(lotsByStatus.waiting[0].netKg) }} · {{ lotsByStatus.waiting.length - 1 }} autres en attente</p>
          </template>
          <p v-else class="body-two mt-2">Personne en attente.</p>
        </div>
        <div class="flex gap-2">
          <button v-if="lotsByStatus.waiting[0]" type="button" class="btn-secondary flex-1" @click="handleQuickAdvance(lotsByStatus.waiting[0])">Lancer</button>
          <button type="button" class="btn-primary flex-1" @click="handleNewReception">+ Réception</button>
        </div>
      </div>
    </div>

    <div class="rise flex min-w-0 items-center gap-2">
      <segmented-control v-model="statusFilter" :options="statusOptions" class="min-w-0" />
      <button
        type="button"
        class="min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors duration-300"
        :class="isMineOnly ? 'border-accent-brown bg-accent-sand/25 text-accent-brown' : 'border-neutral-200 bg-white text-neutral-700'"
        :aria-pressed="isMineOnly"
        @click="isMineOnly = !isMineOnly"
      >
        Mes lots
      </button>
    </div>

    <TransitionGroup tag="div" name="list" class="relative grid gap-2 md:grid-cols-2">
      <lot-card v-for="lot in filteredLots" :key="lot.id" :lot="lot" is-status-shown @open="handleOpen" @advance="handleQuickAdvance" />
    </TransitionGroup>
    <p v-if="!filteredLots.length" class="body-two py-10 text-center">Aucun lot pour ce filtre</p>

    <lot-sheet :lot="openLot" @close="openLot = null" @advance="handleSheetAdvance" />
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — chosen Operator Home (ticket 0018). Mock data only; nothing is saved.
// imports
import { computed, reactive, ref } from 'vue';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import {
  advanceLot,
  createLots,
  formatKg,
  LOT_STATUSES,
  STATUS_LABELS,
  type ILotPrototype,
  type LotStatus,
} from 'dashboard/prototype/mock-home.prototype';

import LotCard from 'dashboard/prototype/lot-card.prototype.vue';
import LotSheet from 'dashboard/prototype/lot-sheet.prototype.vue';
import SegmentedControl from 'dashboard/prototype/segmented-control.prototype.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();

// variables
const STATUS_FILTERS: { key: LotStatus | 'active'; label: string }[] = [
  { key: 'active', label: 'En cours' },
  ...LOT_STATUSES.map((status) => ({ key: status, label: STATUS_LABELS[status] })),
];
const lots = reactive<ILotPrototype[]>(createLots());
const isMineOnly = ref(false);
const statusFilter = ref<LotStatus | 'active'>('active');
const openLot = ref<ILotPrototype | null>(null);

// computed
const siteLots = computed((): ILotPrototype[] =>
  siteStore.isAllSites ? lots : lots.filter((lot) => lot.siteId === siteStore.currentSiteId),
);
const visibleLots = computed((): ILotPrototype[] => siteLots.value.filter((lot) => !isMineOnly.value || lot.isMine));
const lotsByStatus = computed(
  (): Record<LotStatus, ILotPrototype[]> =>
    Object.fromEntries(LOT_STATUSES.map((status) => [status, visibleLots.value.filter((lot) => lot.status === status)])) as Record<
      LotStatus,
      ILotPrototype[]
    >,
);
const statusOptions = computed(() => STATUS_FILTERS.map((filter) => ({ ...filter, count: filterCount(filter.key) })));
const pendingSyncCount = computed((): number => siteLots.value.filter((lot) => lot.isPendingSync).length);
const filteredLots = computed((): ILotPrototype[] =>
  visibleLots.value
    .filter((lot) => (statusFilter.value === 'active' ? lot.status !== 'withdrawn' : lot.status === statusFilter.value))
    .sort((first, second) => second.receivedAt.localeCompare(first.receivedAt)),
);

// methods
const filterCount = (key: LotStatus | 'active'): number =>
  visibleLots.value.filter((lot) => (key === 'active' ? lot.status !== 'withdrawn' : lot.status === key)).length;

// event handlers
const handleOpen = (lot: ILotPrototype): void => {
  openLot.value = lot;
};

const handleQuickAdvance = (lot: ILotPrototype): void => {
  if (lot.status === 'pressing') {
    openLot.value = lot;
    return;
  }
  advanceLot(lot);
  toastStore.push(`${lot.code} → ${STATUS_LABELS[lot.status]}`, 'success');
};

const handleSheetAdvance = (lot: ILotPrototype, oilKg?: number): void => {
  advanceLot(lot, oilKg);
  toastStore.push(`${lot.code} → ${STATUS_LABELS[lot.status]}`, 'success');
};

const handleNewReception = (): void => {
  toastStore.push('Prototype : le formulaire de réception fait l’objet de son propre ticket.', 'info');
};
</script>
