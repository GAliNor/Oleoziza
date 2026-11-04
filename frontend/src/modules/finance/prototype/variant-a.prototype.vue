<template>
  <!-- PROTOTYPE: Finances view (ticket 0034): the four tiles, then the app's table with « À confirmer » / « Tous les mouvements » tabs; a row slides the table out for the detail. -->
  <finance-tiles v-show="!isOpen" class="rise" :figures="figures" :period="period" layout="grid" :is-active="tab === 'pending'" @pending="handleTab('pending')" />

  <div v-show="!isOpen" class="rise flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <input v-model="search" class="input md:max-w-xs" type="search" placeholder="Client, référence ou n°" />
    <ui-segmented class="shrink-0 self-start md:self-auto" variant="tabs" :model-value="tab" :options="TAB_OPTIONS" label="Mouvements" @update:model-value="handleTab">
      <template #option="{ option }">
        {{ option.label }}
        <span v-if="option.key === 'pending'" class="chip ml-1 bg-warning-subtle text-fg-warning">{{ pending.length }}</span>
      </template>
    </ui-segmented>
  </div>

  <ui-master-detail :is-open="isOpen" back-label="Retour aux finances" @close="handleClose">
    <template #list>
      <div class="table-card">
        <table class="data-table">
          <thead>
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
          <tbody :key="`${tab}-${page}-${search}`" class="stagger">
            <tr
              v-for="movement in pageRows"
              :key="movement.id"
              class="data-row"
              :class="{ 'bg-selected/40': movement.id === lastId }"
              tabindex="0"
              @click="handleOpen(movement.id)"
              @keydown.enter="handleOpen(movement.id)"
            >
              <td class="px-4 py-3 whitespace-nowrap text-fg-primary-paragraph">{{ formatDateTime(movement.recordedAt) }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-fg-display">{{ movement.client }}</p>
                <p class="body-two">{{ movement.code }}<span class="lg:hidden"> · {{ PURPOSE_LABELS[movement.purpose] }}</span></p>
              </td>
              <td class="hidden px-4 py-3 text-fg-primary-paragraph lg:table-cell">{{ movement.label }}</td>
              <td class="hidden px-4 py-3 whitespace-nowrap md:table-cell">
                {{ METHOD_LABELS[movement.method] }}
                <span v-if="movement.hasProof" class="chip ml-1 bg-subtle text-fg-primary-paragraph">photo</span>
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph xl:table-cell">{{ movement.recordedBy }}</td>
              <td class="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums" :class="movement.kind === 'payment' ? 'text-fg-brand' : 'text-fg-accent'">
                {{ movement.kind === 'payment' ? '+' : '−' }}{{ formatMoney(movement.amount) }}
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap sm:table-cell"><span class="chip" :class="STATUS_CLASSES[movement.status]">{{ STATUS_LABELS[movement.status] }}</span></td>
            </tr>
          </tbody>
        </table>
        <ui-empty-state v-if="!rows.length" :message="tab === 'pending' ? 'Rien à confirmer. Tout est à jour.' : 'Aucun mouvement sur la période'" />
      </div>
      <ui-pagination v-model:page="page" :page-count="pageCount" :total="rows.length" :page-size="PAGE_SIZE" />
    
    </template>
    <template v-if="active" #detail>
      <div class="flex flex-wrap items-center gap-2">
        <button v-if="nextPendingId" type="button" class="link ml-auto" @click="handleOpen(nextPendingId)">Suivant à confirmer →</button>
      </div>
      <movement-detail :key="active.id" class="max-w-4xl" :movement="active" />
    
    </template>
  </ui-master-detail>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePagedRows } from 'global/composables/use-paged-rows';
import { METHOD_LABELS, PURPOSE_LABELS, STATUS_CLASSES, STATUS_LABELS, type IMovementPrototype } from 'finance/prototype/mock-finance.prototype';
import { useFinancePrototype } from 'finance/prototype/use-finance.prototype';
import { formatMoney } from 'global/composables/money';
import { formatDateTime } from 'global/composables/date';

import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import FinanceTiles from 'finance/prototype/finance-tiles.prototype.vue';
import MovementDetail from 'finance/prototype/movement-detail.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const { inPeriod, pending, figures, period, find } = useFinancePrototype();

// variables
const PAGE_SIZE = 10;
const TABS = { pending: 'À confirmer', all: 'Tous les mouvements' } as const;
const TAB_OPTIONS = [
  { key: 'pending' as const, label: TABS.pending },
  { key: 'all' as const, label: TABS.all },
];
const search = ref('');
const lastId = ref<string | null>(null);

// computed
const tab = computed((): keyof typeof TABS => (route.query.tab === 'all' ? 'all' : 'pending'));
const rows = computed((): IMovementPrototype[] => {
  const query = search.value.trim().toLowerCase();
  return (tab.value === 'pending' ? pending.value : inPeriod.value).filter(
    (movement) =>
      [movement.client, movement.code, movement.reference ?? '', movement.label].some((value) => value.toLowerCase().includes(query)),
  );
});
const { page, pageCount, pageRows } = usePagedRows(rows, PAGE_SIZE);
const openId = computed((): string | null => (typeof route.query.movement === 'string' ? route.query.movement : null));
const isOpen = computed((): boolean => find(openId.value) !== undefined);
const active = computed((): IMovementPrototype | undefined => find(openId.value ?? lastId.value));
const nextPendingId = computed((): string | null => pending.value.find((movement) => movement.id !== openId.value)?.id ?? null);

// watchers
watch([search, tab], () => {
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
