<template>
  <!-- PROTOTYPE: variant C (ticket 0034): a day-by-day ledger (in and out, daily totals) beside a column of stacked tiles; pending lines can be ticked and confirmed together. -->
  <div class="flex min-w-0 gap-4 overflow-hidden">
    <div class="grid w-full shrink-0 gap-4 transition-[margin,width] duration-500 ease-(--ease-premium) lg:grid-cols-[18rem_1fr] lg:items-start" :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }">
      <div class="rise flex flex-col gap-3">
        <finance-tiles :figures="figures" :period="period" layout="stacked" :is-active="isPendingOnly" @pending="isPendingOnly = !isPendingOnly" />
        <label class="card flex items-center gap-2 rounded-2xl body-two">
          <input v-model="isPendingOnly" type="checkbox" class="h-4 w-4 accent-primary-olive-dark" />
          Seulement les {{ pending.length }} à confirmer
        </label>
      </div>

      <div class="rise flex min-w-0 flex-col gap-4">
        <section v-for="day in days" :key="day.key" class="card min-w-0 rounded-2xl p-0">
          <header class="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-neutral-100 px-4 py-3">
            <h2 class="font-semibold text-neutral-900 first-letter:uppercase">{{ day.label }}</h2>
            <span class="body-two tabular-nums">entrées <span class="font-medium text-primary-olive-dark">+{{ formatDh(day.totalIn) }}</span></span>
            <span class="body-two tabular-nums">sorties <span class="font-medium text-accent-rust">−{{ formatDh(day.totalOut) }}</span></span>
            <span v-if="day.pendingCount" class="chip ml-auto bg-warning-amber/15 text-warning-amber">{{ day.pendingCount }} à confirmer</span>
          </header>
          <ul class="stagger divide-y divide-neutral-100">
            <li v-for="movement in day.items" :key="movement.id" class="flex items-center gap-3 px-4 py-2.5" :class="{ 'bg-warning-amber/5': movement.status === 'pending' }">
              <input
                v-if="movement.status === 'pending' && canConfirm"
                v-model="selected"
                type="checkbox"
                class="h-5 w-5 shrink-0 accent-primary-olive-dark"
                :value="movement.id"
                :aria-label="`Sélectionner ${movement.code}`"
              />
              <span v-else class="w-5 shrink-0 text-center text-neutral-300">·</span>
              <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="handleOpen(movement.id)">
                <span class="w-12 shrink-0 text-xs text-neutral-500 tabular-nums">{{ formatTime(movement.recordedAt) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium text-neutral-900">{{ movement.client }}</span>
                  <span class="block truncate text-xs text-neutral-500">{{ movement.label }} · {{ METHOD_LABELS[movement.method] }}</span>
                </span>
                <span class="chip hidden sm:inline-flex" :class="STATUS_CLASSES[movement.status]">{{ STATUS_LABELS[movement.status] }}</span>
                <span class="w-28 shrink-0 text-right font-semibold tabular-nums" :class="amountClass(movement)">
                  {{ movement.kind === 'payment' ? '+' : '−' }}{{ formatDh(movement.amount) }}
                </span>
              </button>
              <button
                v-if="movement.status === 'pending' && canConfirm"
                type="button"
                class="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-primary-olive-dark hover:bg-primary-olive-light md:block"
                :disabled="!isOnline"
                @click="confirm(movement)"
              >
                Confirmer
              </button>
            </li>
          </ul>
        </section>
        <p v-if="!days.length" class="card body-two text-center">{{ isPendingOnly ? 'Rien à confirmer.' : 'Aucun mouvement sur la période.' }}</p>
      </div>
    </div>

    <aside v-if="active" class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)" :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'" :aria-hidden="!isOpen">
      <button type="button" class="btn-secondary self-start" @click="handleClose">← Retour au journal</button>
      <movement-detail :key="active.id" class="max-w-4xl" :movement="active" />
    </aside>
  </div>

  <div
    v-if="selected.length && !isOpen"
    class="fixed inset-x-4 bottom-36 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3 text-white shadow-xl md:bottom-20"
  >
    <span class="flex-1 text-sm">{{ selected.length }} sélectionné(s) · <span class="font-semibold tabular-nums">{{ formatDh(selectedTotal) }}</span></span>
    <button type="button" class="text-sm text-white/70 hover:text-white" @click="selected = []">Vider</button>
    <button type="button" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-900" :disabled="!isOnline" @click="handleConfirmSelected">Confirmer la sélection</button>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { formatDh } from 'dashboard/prototype/mock-home.prototype';
import { METHOD_LABELS, STATUS_CLASSES, STATUS_LABELS, formatDay, type IMovementPrototype } from 'finance/prototype/mock-finance.prototype';
import { useFinancePrototype } from 'finance/prototype/use-finance.prototype';

import FinanceTiles from 'finance/prototype/finance-tiles.prototype.vue';
import MovementDetail from 'finance/prototype/movement-detail.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const { inPeriod, pending, figures, period, isOnline, canConfirm, confirm, find } = useFinancePrototype();

// variables
const isPendingOnly = ref(route.query.tab !== 'all' && pending.value.length > 0);
const selected = ref<string[]>([]);
const lastId = ref<string | null>(null);

// computed
const days = computed(() => {
  const source = isPendingOnly.value ? [...pending.value].reverse() : inPeriod.value;
  const groups = new Map<string, IMovementPrototype[]>();
  for (const movement of source) {
    const key = movement.recordedAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), movement]);
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: formatDay(items[0].recordedAt),
    items,
    totalIn: items.filter((item) => item.kind === 'payment' && item.status !== 'rejected' && item.status !== 'cancelled').reduce((sum, item) => sum + item.amount, 0),
    totalOut: items.filter((item) => item.kind === 'payout' && item.status !== 'rejected').reduce((sum, item) => sum + item.amount, 0),
    pendingCount: items.filter((item) => item.status === 'pending').length,
  }));
});
const selectedTotal = computed((): number => selected.value.reduce((sum, id) => sum + (find(id)?.amount ?? 0), 0));
const openId = computed((): string | null => (typeof route.query.movement === 'string' ? route.query.movement : null));
const isOpen = computed((): boolean => find(openId.value) !== undefined);
const active = computed((): IMovementPrototype | undefined => find(openId.value ?? lastId.value));

// watchers
watch(
  openId,
  (id) => {
    if (id) lastId.value = id;
  },
  { immediate: true },
);

// methods
const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const amountClass = (movement: IMovementPrototype): string => {
  if (movement.status === 'rejected' || movement.status === 'cancelled') return 'text-neutral-400 line-through';
  return movement.kind === 'payment' ? 'text-primary-olive-dark' : 'text-accent-rust';
};

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, movement: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, movement: undefined } });
};

const handleConfirmSelected = (): void => {
  for (const id of selected.value) {
    const movement = find(id);
    if (movement) confirm(movement);
  }
  selected.value = [];
};
</script>
