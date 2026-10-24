<template>
  <!-- PROTOTYPE: variant A (ticket 0034): the four tiles, then the app's table with « À confirmer » / « Tous les mouvements » tabs; a row slides the table out for the detail. -->
  <finance-tiles v-show="!isOpen" class="rise" :figures="figures" :period="period" layout="grid" :is-active="tab === 'pending'" @pending="handleTab('pending')" />

  <div v-show="!isOpen" class="rise flex flex-col gap-3 lg:flex-row lg:items-center">
    <div class="inline-flex self-start rounded-xl bg-neutral-100 p-1" role="tablist">
      <button
        v-for="(label, key) in TABS"
        :key="key"
        type="button"
        role="tab"
        :aria-selected="tab === key"
        class="min-h-10 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors"
        :class="tab === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'"
        @click="handleTab(key)"
      >
        {{ label }}
        <span v-if="key === 'pending'" class="chip ml-1 bg-warning-amber/15 text-warning-amber">{{ pending.length }}</span>
      </button>
    </div>
    <input v-model="search" class="input lg:max-w-xs" type="search" placeholder="Client, référence ou n°" />
    <div class="flex flex-wrap gap-2">
      <button v-for="(label, key) in KINDS" :key="key" type="button" class="choice-chip" :class="{ 'choice-chip-active': kind === key }" @click="kind = key">{{ label }}</button>
    </div>
  </div>

  <div class="flex min-w-0 gap-4 overflow-hidden">
    <div class="flex w-full shrink-0 flex-col gap-3 transition-[margin,width] duration-500 ease-(--ease-premium)" :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }">
      <div class="card min-w-0 overflow-x-auto rounded-2xl p-0">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
            <tr>
              <th class="px-4 py-3 font-semibold">Date</th>
              <th class="px-4 py-3 font-semibold">Client</th>
              <th class="hidden px-4 py-3 font-semibold lg:table-cell">Objet</th>
              <th class="hidden px-4 py-3 font-semibold md:table-cell">Mode</th>
              <th class="hidden px-4 py-3 font-semibold xl:table-cell">Saisi par</th>
              <th class="px-4 py-3 text-right font-semibold">Montant</th>
              <th class="hidden px-4 py-3 font-semibold sm:table-cell">Statut</th>
            </tr>
          </thead>
          <tbody :key="`${tab}-${page}-${kind}-${search}`" class="stagger">
            <tr
              v-for="movement in pageRows"
              :key="movement.id"
              class="cursor-pointer border-t border-neutral-100 transition-colors hover:bg-neutral-50"
              :class="{ 'bg-primary-olive-light/40': movement.id === lastId }"
              tabindex="0"
              @click="handleOpen(movement.id)"
              @keydown.enter="handleOpen(movement.id)"
            >
              <td class="px-4 py-3 whitespace-nowrap text-neutral-600">{{ formatWhen(movement.recordedAt) }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-neutral-900">{{ movement.client }}</p>
                <p class="body-two">{{ movement.code }}<span class="lg:hidden"> · {{ PURPOSE_LABELS[movement.purpose] }}</span></p>
              </td>
              <td class="hidden px-4 py-3 text-neutral-700 lg:table-cell">{{ movement.label }}</td>
              <td class="hidden px-4 py-3 whitespace-nowrap md:table-cell">
                {{ METHOD_LABELS[movement.method] }}
                <span v-if="movement.hasProof" class="chip ml-1 bg-neutral-100 text-neutral-600">photo</span>
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap text-neutral-600 xl:table-cell">{{ movement.recordedBy }}</td>
              <td class="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums" :class="movement.kind === 'payment' ? 'text-primary-olive-dark' : 'text-accent-rust'">
                {{ movement.kind === 'payment' ? '+' : '−' }}{{ formatDh(movement.amount) }}
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap sm:table-cell"><span class="chip" :class="STATUS_CLASSES[movement.status]">{{ STATUS_LABELS[movement.status] }}</span></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!rows.length" class="body-two px-5 py-8 text-center">{{ tab === 'pending' ? 'Rien à confirmer. Tout est à jour.' : 'Aucun mouvement sur la période' }}</p>
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
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-secondary inline-flex items-center gap-2" @click="handleClose">← Retour aux finances</button>
        <button v-if="nextPendingId" type="button" class="link ml-auto" @click="handleOpen(nextPendingId)">Suivant à confirmer →</button>
      </div>
      <movement-detail :key="active.id" class="max-w-4xl" :movement="active" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { formatDh } from 'dashboard/prototype/mock-home.prototype';
import { METHOD_LABELS, PURPOSE_LABELS, STATUS_CLASSES, STATUS_LABELS, formatWhen, type IMovementPrototype } from 'finance/prototype/mock-finance.prototype';
import { useFinancePrototype } from 'finance/prototype/use-finance.prototype';

import FinanceTiles from 'finance/prototype/finance-tiles.prototype.vue';
import MovementDetail from 'finance/prototype/movement-detail.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const { inPeriod, pending, figures, period, find } = useFinancePrototype();

// variables
const PAGE_SIZE = 10;
const TABS = { pending: 'À confirmer', all: 'Tous les mouvements' } as const;
const KINDS = { all: 'Tous', payment: 'Paiements reçus', payout: 'Versements payés' } as const;
const search = ref('');
const kind = ref<keyof typeof KINDS>('all');
const page = ref(1);
const lastId = ref<string | null>(null);

// computed
const tab = computed((): keyof typeof TABS => (route.query.tab === 'all' ? 'all' : 'pending'));
const rows = computed((): IMovementPrototype[] => {
  const query = search.value.trim().toLowerCase();
  return (tab.value === 'pending' ? pending.value : inPeriod.value).filter(
    (movement) =>
      (kind.value === 'all' || movement.kind === kind.value) &&
      [movement.client, movement.code, movement.reference ?? '', movement.label].some((value) => value.toLowerCase().includes(query)),
  );
});
const pageCount = computed((): number => Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)));
const firstIndex = computed((): number => (page.value - 1) * PAGE_SIZE);
const pageRows = computed((): IMovementPrototype[] => rows.value.slice(firstIndex.value, firstIndex.value + PAGE_SIZE));
const openId = computed((): string | null => (typeof route.query.movement === 'string' ? route.query.movement : null));
const isOpen = computed((): boolean => find(openId.value) !== undefined);
const active = computed((): IMovementPrototype | undefined => find(openId.value ?? lastId.value));
const nextPendingId = computed((): string | null => pending.value.find((movement) => movement.id !== openId.value)?.id ?? null);

// watchers
watch([search, kind, tab], () => {
  page.value = 1;
});
watch(
  openId,
  (id) => {
    if (id) lastId.value = id;
  },
  { immediate: true },
);

// event handlers
const handleTab = (key: keyof typeof TABS): void => {
  router.replace({ query: { ...route.query, tab: key === 'pending' ? undefined : key, movement: undefined } });
};

const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, movement: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, movement: undefined } });
};
</script>
