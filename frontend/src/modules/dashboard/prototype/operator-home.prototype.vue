<template>
  <!-- PROTOTYPE: chosen Operator Home (variant C, ticket 0018): hero cards, then one flat list of Lots with their stage, narrowed by filters. -->
  <section class="mx-auto flex max-w-5xl flex-col gap-4">
    <div class="rise flex flex-col gap-1.5">
      <h1 class="heading-one">Bonjour {{ authStore.session?.firstName }}</h1>
      <p class="body-two">{{ visibleLots.length }} lots aujourd’hui · {{ pendingSyncCount }} à synchroniser</p>
    </div>

    <div class="stagger grid gap-3 md:grid-cols-2">
      <div class="lift flex flex-col gap-4 rounded-3xl bg-primary-olive-dark p-5 text-white">
        <p class="text-xs font-semibold tracking-widest text-primary-olive-light uppercase">Production du jour</p>
        <div class="grid grid-cols-3 gap-3">
          <hero-stat label="Olives" :value="todayFigures.oliveKg" unit="kg" :sub="`${todayFigures.receptions} réceptions`" is-dark />
          <hero-stat label="Huile" :value="todayFigures.oilKg" unit="kg" :sub="formatLitres(todayFigures.oilKg)" is-dark />
          <hero-stat label="Rendement" :value="todayFigures.yieldPct" :decimals="1" unit="%" :sub="`${todayFigures.pressedCount} lots pressés`" is-dark />
        </div>
        <div class="mt-auto flex items-center gap-3 border-t border-white/15 pt-4">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-primary-olive-light">En pressage</p>
            <p v-if="lotsByStatus.pressing[0]" class="truncate font-medium">{{ lotsByStatus.pressing[0].client }} · {{ formatKg(lotsByStatus.pressing[0].netKg) }}</p>
            <p v-else class="font-medium">La ligne est libre</p>
          </div>
          <button
            v-if="lotsByStatus.pressing[0]"
            type="button"
            class="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-primary-olive-dark"
            @click="handleQuickAdvance(lotsByStatus.pressing[0])"
          >
            Saisir l’huile
          </button>
        </div>
      </div>
      <div class="card lift flex flex-col gap-4 rounded-3xl p-5">
        <p class="eyebrow">À traiter</p>
        <div class="grid grid-cols-3 gap-3">
          <hero-stat label="À mettre en file" :value="lotsByStatus.received.length" :sub="formatKg(sumNetKg(lotsByStatus.received))" />
          <hero-stat label="En attente" :value="lotsByStatus.waiting.length" :sub="`≈ ${formatHours(queueHours)} de pressage`" />
          <hero-stat label="À retirer" :value="lotsByStatus.pressed.length" :sub="formatKg(sumOilKg(lotsByStatus.pressed))" />
        </div>
        <div class="mt-auto flex items-center gap-2 border-t border-neutral-100 pt-4">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-neutral-500">Prochain à presser</p>
            <p class="truncate font-medium text-neutral-900">{{ lotsByStatus.waiting[0]?.client ?? 'Personne en attente' }}</p>
          </div>
          <button v-if="lotsByStatus.waiting[0]" type="button" class="btn-secondary shrink-0" @click="handleQuickAdvance(lotsByStatus.waiting[0])">Lancer</button>
          <button type="button" class="btn-primary shrink-0" @click="handleNewReception">+ Réception</button>
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
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useReceptionStore } from 'reception/stores/reception';
import { toPrototypeLot } from 'dashboard/prototype/reception-bridge.prototype';
import {
  advanceLot,
  createLots,
  formatKg,
  formatLitres,
  LOT_STATUSES,
  STATUS_LABELS,
  type ILotPrototype,
  type LotStatus,
} from 'dashboard/prototype/mock-home.prototype';

import HeroStat from 'dashboard/prototype/hero-stat.prototype.vue';
import LotCard from 'dashboard/prototype/lot-card.prototype.vue';
import LotSheet from 'dashboard/prototype/lot-sheet.prototype.vue';
import SegmentedControl from 'dashboard/prototype/segmented-control.prototype.vue';

// stores
const router = useRouter();
const receptionStore = useReceptionStore();
const authStore = useAuthStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();

// variables
const LINE_THROUGHPUT_KG_PER_HOUR = 1500;
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
const todayFigures = computed(() => {
  const pressed = visibleLots.value.filter((lot) => lot.oilKg !== null);
  const oilKg = sumOilKg(pressed);
  const pressedNetKg = sumNetKg(pressed);
  return {
    oliveKg: sumNetKg(visibleLots.value),
    receptions: visibleLots.value.length,
    oilKg,
    yieldPct: pressedNetKg ? (oilKg / pressedNetKg) * 100 : 0,
    pressedCount: pressed.length,
  };
});
const queueHours = computed((): number => sumNetKg(lotsByStatus.value.waiting) / LINE_THROUGHPUT_KG_PER_HOUR);
const statusOptions = computed(() => STATUS_FILTERS.map((filter) => ({ ...filter, count: filterCount(filter.key) })));
const pendingSyncCount = computed((): number => siteLots.value.filter((lot) => lot.isPendingSync).length);
const filteredLots = computed((): ILotPrototype[] =>
  visibleLots.value
    .filter((lot) => (statusFilter.value === 'active' ? lot.status !== 'withdrawn' : lot.status === statusFilter.value))
    .sort((first, second) => second.receivedAt.localeCompare(first.receivedAt)),
);

// watchers
watch(
  () => siteStore.currentSite?.id,
  (siteId) => {
    if (siteId) receptionStore.fetchSite(siteId);
  },
  { immediate: true },
);

watch(
  () => receptionStore.lots,
  (receptionLots) => {
    receptionLots.forEach((receptionLot) => {
      const mapped = toPrototypeLot(receptionLot, authStore.session?.firstName ?? '');
      const index = lots.findIndex((lot) => lot.code === mapped.code);
      if (index === -1) lots.unshift(mapped);
      else lots.splice(index, 1, mapped);
    });
  },
  { immediate: true, deep: true },
);

// methods
const sumNetKg = (list: ILotPrototype[]): number => list.reduce((total, lot) => total + lot.netKg, 0);

const sumOilKg = (list: ILotPrototype[]): number => list.reduce((total, lot) => total + (lot.oilKg ?? 0), 0);

const formatHours = (hours: number): string => {
  const minutes = Math.round(hours * 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
};

const filterCount = (key: LotStatus | 'active'): number =>
  visibleLots.value.filter((lot) => (key === 'active' ? lot.status !== 'withdrawn' : lot.status === key)).length;

// event handlers
const handleOpen = (lot: ILotPrototype): void => {
  openLot.value = lot;
};

const handleQuickAdvance = (lot: ILotPrototype): void => {
  if (lot.status === 'received') {
    router.push({ name: 'reception-station', params: { code: lot.code } });
    return;
  }
  if (lot.status === 'pressing') {
    openLot.value = lot;
    return;
  }
  advanceLot(lot);
  toastStore.push(`${lot.code} → ${STATUS_LABELS[lot.status]}`, 'success');
};

const handleSheetAdvance = (lot: ILotPrototype, oilKg?: number): void => {
  if (lot.status === 'received') {
    handleQuickAdvance(lot);
    return;
  }
  advanceLot(lot, oilKg);
  toastStore.push(`${lot.code} → ${STATUS_LABELS[lot.status]}`, 'success');
};

const handleNewReception = (): void => {
  router.push({ name: 'reception-new' });
};
</script>
