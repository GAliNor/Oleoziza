<template>
  <!-- PROTOTYPE: three variants of the Operator Home on the existing "/" route, switchable via ?variant=A|B|C (ticket 0018). -->
  <section class="mx-auto flex max-w-5xl flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="heading-one">Bonjour {{ authStore.session?.firstName }}</h1>
        <p class="body-two">{{ visibleLots.length }} lots aujourd’hui · {{ pendingSyncCount }} à synchroniser</p>
      </div>
      <div v-if="variant !== 'C'" class="flex items-center gap-2">
        <label class="flex items-center gap-2 text-sm text-neutral-700">
          <input v-model="isMineOnly" type="checkbox" class="h-4 w-4 accent-primary-olive" /> Mes lots
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-700">
          <input v-model="isWithdrawnShown" type="checkbox" class="h-4 w-4 accent-primary-olive" /> Retirés
        </label>
      </div>
    </div>

    <!-- A: swipeable kanban, one status per screen on a phone, all columns on a tablet -->
    <template v-if="variant === 'A'">
      <nav class="sticky top-16 z-30 -mx-4 flex gap-2 overflow-x-auto bg-neutral-50/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
        <button
          v-for="status in shownStatuses"
          :key="status"
          type="button"
          class="chip shrink-0 border border-neutral-200 bg-white px-3 py-1.5 text-sm"
          :class="{ 'border-primary-olive bg-primary-olive-light text-primary-olive-dark': activeColumn === status }"
          @click="handleScrollToColumn(status)"
        >
          {{ STATUS_LABELS[status] }} <span class="font-semibold tabular-nums">{{ lotsByStatus[status].length }}</span>
        </button>
      </nav>
      <div
        ref="kanban"
        class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0"
        :class="isWithdrawnShown ? 'md:grid-cols-5' : 'md:grid-cols-4'"
        @scroll.passive="handleKanbanScroll"
      >
        <div
          v-for="status in shownStatuses"
          :key="status"
          :data-status="status"
          class="flex w-[85vw] shrink-0 snap-center flex-col gap-3 rounded-2xl bg-neutral-100 p-3 md:w-auto"
        >
          <h2 class="flex items-center justify-between px-1 text-sm font-semibold text-neutral-700">
            {{ STATUS_LABELS[status] }}
            <span class="tabular-nums text-neutral-500">{{ lotsByStatus[status].length }}</span>
          </h2>
          <lot-card v-for="lot in lotsByStatus[status]" :key="lot.id" :lot="lot" @open="handleOpen" @advance="handleQuickAdvance" />
          <p v-if="!lotsByStatus[status].length" class="body-two px-1 py-6 text-center">Aucun lot</p>
        </div>
      </div>
      <button
        type="button"
        class="btn-primary fixed right-4 bottom-36 z-40 rounded-full shadow-lg md:right-8 md:bottom-8"
        @click="handleNewReception"
      >
        + Nouvelle réception
      </button>
    </template>

    <!-- B: status tabs over a single list -->
    <template v-else-if="variant === 'B'">
      <button type="button" class="btn-primary w-full text-base" @click="handleNewReception">+ Nouvelle réception</button>
      <div class="grid rounded-2xl bg-neutral-100 p-1" :style="{ gridTemplateColumns: `repeat(${shownStatuses.length}, minmax(0, 1fr))` }">
        <button
          v-for="status in shownStatuses"
          :key="status"
          type="button"
          class="flex flex-col items-center rounded-xl py-2 text-xs font-medium text-neutral-600"
          :class="{ 'bg-white text-primary-olive-dark shadow-sm': activeTab === status }"
          @click="activeTab = status"
        >
          <span class="text-lg font-semibold tabular-nums">{{ lotsByStatus[status].length }}</span>
          {{ STATUS_LABELS[status] }}
        </button>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <lot-card v-for="lot in lotsByStatus[activeTab]" :key="lot.id" :lot="lot" @open="handleOpen" @advance="handleQuickAdvance" />
      </div>
      <p v-if="!lotsByStatus[activeTab].length" class="body-two py-10 text-center">Aucun lot « {{ STATUS_LABELS[activeTab] }} »</p>
    </template>

    <!-- C: action-first hero cards, then one flat list of Lots with their stage, narrowed by filters -->
    <template v-else>
      <div class="grid gap-3 md:grid-cols-2">
        <div class="rounded-3xl bg-primary-olive-dark p-5 text-white">
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
        <div class="card flex flex-col justify-between gap-3 rounded-3xl p-5">
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

      <div class="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:px-0">
        <button
          v-for="filter in STATUS_FILTERS"
          :key="filter.key"
          type="button"
          class="chip min-h-10 shrink-0 border px-3.5 text-sm"
          :class="statusFilter === filter.key ? 'border-primary-olive bg-primary-olive-light text-primary-olive-dark' : 'border-neutral-200 bg-white text-neutral-700'"
          @click="statusFilter = filter.key"
        >
          {{ filter.label }} <span class="font-semibold tabular-nums">{{ filterCount(filter.key) }}</span>
        </button>
        <button
          type="button"
          class="chip min-h-10 shrink-0 border px-3.5 text-sm"
          :class="isMineOnly ? 'border-accent-brown bg-accent-sand/25 text-accent-brown' : 'border-neutral-200 bg-white text-neutral-700'"
          @click="isMineOnly = !isMineOnly"
        >
          Mes lots
        </button>
      </div>

      <div class="grid gap-2 md:grid-cols-2">
        <lot-card v-for="lot in filteredLots" :key="lot.id" :lot="lot" is-status-shown @open="handleOpen" @advance="handleQuickAdvance" />
      </div>
      <p v-if="!filteredLots.length" class="body-two py-10 text-center">Aucun lot pour ce filtre</p>
    </template>

    <lot-sheet :lot="openLot" @close="openLot = null" @advance="handleSheetAdvance" />
    <prototype-switcher :variants="VARIANTS" />
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — Operator Home variants (ticket 0018). Mock data only; nothing is saved.
// imports
import { computed, reactive, ref, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';

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
import PrototypeSwitcher from 'global/components/prototype-switcher.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const route = useRoute();

// variables
const VARIANTS = { A: 'Kanban à glisser', B: 'Onglets de statut', C: 'Action d’abord + liste filtrée' };
const lots = reactive<ILotPrototype[]>(createLots());
const isMineOnly = ref(false);
const isWithdrawnShown = ref(false);
const activeTab = ref<LotStatus>('waiting');
const activeColumn = ref<LotStatus>('received');
const openLot = ref<ILotPrototype | null>(null);
const STATUS_FILTERS: { key: LotStatus | 'active'; label: string }[] = [
  { key: 'active', label: 'En cours' },
  ...LOT_STATUSES.map((status) => ({ key: status, label: STATUS_LABELS[status] })),
];
const statusFilter = ref<LotStatus | 'active'>('active');
const kanban = useTemplateRef<HTMLElement>('kanban');

// computed
const variant = computed((): string => (['A', 'B', 'C'].includes(String(route.query.variant)) ? String(route.query.variant) : 'A'));
const siteLots = computed((): ILotPrototype[] =>
  siteStore.isAllSites ? lots : lots.filter((lot) => lot.siteId === siteStore.currentSiteId),
);
const visibleLots = computed((): ILotPrototype[] => siteLots.value.filter((lot) => !isMineOnly.value || lot.isMine));
const shownStatuses = computed((): LotStatus[] => LOT_STATUSES.filter((status) => isWithdrawnShown.value || status !== 'withdrawn'));
const lotsByStatus = computed(
  (): Record<LotStatus, ILotPrototype[]> =>
    Object.fromEntries(LOT_STATUSES.map((status) => [status, visibleLots.value.filter((lot) => lot.status === status)])) as Record<
      LotStatus,
      ILotPrototype[]
    >,
);
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

const handleScrollToColumn = (status: LotStatus): void => {
  kanban.value?.querySelector<HTMLElement>(`[data-status="${status}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  activeColumn.value = status;
};

const handleKanbanScroll = (): void => {
  const element = kanban.value;
  if (!element) return;
  const columnWidth = element.scrollWidth / shownStatuses.value.length;
  activeColumn.value = shownStatuses.value[Math.round(element.scrollLeft / columnWidth)] ?? activeColumn.value;
};
</script>
