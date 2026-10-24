<template>
  <!-- PROTOTYPE: variant C (ticket 0036): review first. « À vérifier » is resolved right on the page, then a compact day-by-day register; in the Lot, each Timeline step is corrected in place. -->
  <div class="flex min-w-0 gap-4 overflow-hidden">
    <div class="flex w-full shrink-0 flex-col gap-5 transition-[margin,width] duration-500 ease-(--ease-premium)" :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }">
      <section class="rise flex flex-col gap-3">
        <h2 class="heading-two">À vérifier <span class="text-neutral-400 tabular-nums">{{ toReview.length }}</span></h2>
        <p v-if="!toReview.length" class="card body-two">Rien à vérifier : aucune saisie hors ligne en conflit ni faite sans le droit.</p>
        <div class="grid gap-3 lg:grid-cols-2">
          <article v-for="lot in toReview" :key="lot.id" class="card flex flex-col gap-3 rounded-2xl border-danger-red/30">
            <header class="flex items-start justify-between gap-2">
              <button type="button" class="text-left" @click="handleOpen(lot.id)">
                <p class="eyebrow">{{ lot.code }} · {{ STATUS_LABELS[lot.status] }}</p>
                <p class="font-semibold text-neutral-900 hover:underline">{{ lot.client }}</p>
              </button>
              <span class="chip bg-danger-red/10 text-danger-red">{{ lot.review!.kind === 'conflict' ? 'Conflit hors ligne' : 'Sans le droit' }}</span>
            </header>
            <template v-if="lot.review!.kind === 'conflict'">
              <p class="body-two">« {{ FIELD_LABELS[lot.review!.field] }} » saisi deux fois hors ligne :</p>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" class="rounded-xl border-2 border-primary-olive-dark p-2 text-left disabled:opacity-60" :disabled="!canCorrect" @click="keepApplied(lot)">
                  <span class="block text-lg font-semibold tabular-nums">{{ lot.review!.applied.value }}</span>
                  <span class="block text-xs text-neutral-500">{{ lot.review!.applied.by.split(' ')[0] }} · appliquée</span>
                </button>
                <button type="button" class="rounded-xl border border-neutral-300 p-2 text-left disabled:opacity-60" :disabled="!canCorrect" @click="takeOther(lot)">
                  <span class="block text-lg font-semibold tabular-nums">{{ lot.review!.other.value }}</span>
                  <span class="block text-xs text-neutral-500">{{ lot.review!.other.by.split(' ')[0] }} · retenir</span>
                </button>
              </div>
            </template>
            <template v-else>
              <p class="body-two">{{ lot.review!.detail }}</p>
              <div class="flex gap-2">
                <button type="button" class="btn-primary flex-1" :disabled="!canCorrect" @click="acceptWrite(lot)">Garder</button>
                <button type="button" class="btn-secondary flex-1 text-danger-red" :disabled="!canCorrect" @click="undoWrite(lot)">Annuler l’étape</button>
              </div>
            </template>
          </article>
        </div>
      </section>

      <section class="rise flex flex-col gap-3">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 class="heading-two">Registre des lots</h2>
          <input v-model="search" class="input md:max-w-xs" type="search" placeholder="N° de lot ou Client" />
        </div>
        <div v-for="day in days" :key="day.key" class="card rounded-2xl p-0">
          <header class="flex flex-wrap items-baseline gap-x-4 border-b border-neutral-100 px-4 py-2.5">
            <h3 class="font-semibold text-neutral-900 first-letter:uppercase">{{ day.label }}</h3>
            <span class="body-two tabular-nums">{{ day.lots.length }} lots · {{ (day.oliveKg / 100).toLocaleString('fr-FR') }} q d’olives · {{ day.oilKg.toLocaleString('fr-FR') }} kg d’huile</span>
          </header>
          <ul class="divide-y divide-neutral-100">
            <li v-for="lot in day.lots" :key="lot.id">
              <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50" @click="handleOpen(lot.id)">
                <span class="w-16 shrink-0 font-medium text-neutral-900">{{ lot.code }}</span>
                <span class="min-w-0 flex-1 truncate text-neutral-800">{{ lot.client }}</span>
                <span class="hidden w-28 text-right text-sm text-neutral-600 tabular-nums sm:block">{{ lot.netKg.toLocaleString('fr-FR') }} kg</span>
                <span class="hidden w-20 text-right text-sm text-neutral-600 tabular-nums md:block">{{ lot.oilKg ? `${((lot.oilKg / lot.netKg) * 100).toFixed(1).replace('.', ',')} %` : '—' }}</span>
                <span class="w-24 text-right"><span class="chip bg-neutral-100 text-neutral-700">{{ STATUS_LABELS[lot.status] }}</span></span>
                <span class="w-3"><span v-if="lot.review" class="block h-2 w-2 rounded-full bg-danger-red" /><span v-else-if="lot.corrections.length" class="block h-2 w-2 rounded-full bg-accent-rust" /></span>
              </button>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <aside v-if="active" class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)" :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'" :aria-hidden="!isOpen">
      <button type="button" class="btn-secondary self-start" @click="handleClose">← Retour au registre</button>
      <lot-detail :key="active.id" class="max-w-3xl" :lot="active" correction-style="inline" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { STATUS_LABELS } from 'dashboard/prototype/mock-home.prototype';
import { FIELD_LABELS, type ILotRecordPrototype } from 'lot/prototype/mock-lots.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

import LotDetail from 'lot/prototype/lot-detail.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const { scoped, toReview, canCorrect, keepApplied, takeOther, acceptWrite, undoWrite, find } = useLotsPrototype();

// variables
const search = ref('');
const lastId = ref<string | null>(null);

// computed
const days = computed(() => {
  const query = search.value.trim().toLowerCase();
  const groups = new Map<string, ILotRecordPrototype[]>();
  for (const lot of scoped.value.filter((item) => item.code.toLowerCase().includes(query) || item.client.toLowerCase().includes(query))) {
    const key = lot.receivedAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), lot]);
  }
  return [...groups.entries()].map(([key, lots]) => ({
    key,
    label: new Date(lots[0].receivedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    lots,
    oliveKg: lots.reduce((sum, lot) => sum + lot.netKg, 0),
    oilKg: lots.reduce((sum, lot) => sum + (lot.oilKg ?? 0), 0),
  }));
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

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, lot: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, lot: undefined } });
};
</script>
