<template>
  <div v-if="lot" class="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 md:items-center" @click.self="emit('close')">
    <section class="flex max-h-[90dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-t-3xl bg-white p-5 md:rounded-3xl">
      <header class="flex items-start justify-between gap-3">
        <div>
          <p class="eyebrow">{{ lot.code }} · {{ STATUS_LABELS[lot.status] }}</p>
          <h2 class="heading-two text-xl">{{ lot.client }}</h2>
          <p class="body-two">{{ lot.variety }} · {{ lot.mode === 'service' ? 'Trituration à façon' : 'Achat' }} · {{ formatKg(lot.netKg) }}</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Fermer" @click="emit('close')">✕</button>
      </header>

      <form v-if="isPressingForm" class="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4" @submit.prevent="handleSubmitOil">
        <label class="label" for="oil-kg">Huile obtenue (kg)</label>
        <input id="oil-kg" v-model.number="oilKg" class="input text-2xl font-semibold" inputmode="decimal" type="number" min="0" />
        <div class="flex gap-6">
          <div>
            <p class="eyebrow text-neutral-500">Rendement</p>
            <p class="text-2xl font-semibold text-primary-olive-dark tabular-nums">{{ yieldText }}</p>
          </div>
          <div>
            <p class="eyebrow text-neutral-500">Volume</p>
            <p class="text-2xl font-semibold text-neutral-900 tabular-nums">{{ oilKg ? formatLitres(oilKg) : '—' }}</p>
          </div>
        </div>
        <p v-if="isYieldOdd" class="text-sm text-warning-amber">Rendement inhabituel (attendu 14–24 %) : vérifiez la saisie.</p>
        <button type="submit" class="btn-primary" :disabled="!oilKg">Enregistrer le pressage</button>
      </form>
      <button v-else-if="NEXT_STEP_LABELS[lot.status]" type="button" class="btn-primary" @click="handleAdvance">
        {{ NEXT_STEP_LABELS[lot.status] }}
      </button>

      <div>
        <h3 class="label mb-3">Parcours du lot</h3>
        <ol class="relative flex flex-col gap-4 border-l-2 border-primary-olive-light pl-5">
          <li v-for="(step, index) in lot.steps" :key="index" class="relative">
            <span
              class="absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white"
              :class="index === lot.steps.length - 1 ? 'bg-primary-olive-dark' : 'bg-primary-olive-mid'"
            />
            <div class="flex items-baseline justify-between gap-2">
              <p class="font-medium text-neutral-900">{{ step.label }}</p>
              <p class="body-two tabular-nums">{{ step.at }}</p>
            </div>
            <p class="body-two">{{ step.detail }}</p>
            <p class="flex items-center gap-1.5 text-xs text-neutral-400">
              par {{ step.by }}
              <span v-if="step.isPendingSync" class="chip bg-warning-amber/15 text-warning-amber">À synchroniser</span>
            </p>
          </li>
          <li v-for="status in remainingStatuses" :key="status" class="relative opacity-50">
            <span class="absolute top-1 -left-[27px] h-3 w-3 rounded-full border-2 border-neutral-300 bg-white ring-4 ring-white" />
            <p class="text-neutral-500">{{ STATUS_LABELS[status] }}</p>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Lot detail with its Lot Timeline and the Pressing form (ticket 0018).
// imports
import { computed, ref, watch } from 'vue';

import {
  formatKg,
  formatLitres,
  LOT_STATUSES,
  NEXT_STEP_LABELS,
  STATUS_LABELS,
  type ILotPrototype,
  type LotStatus,
} from 'dashboard/prototype/mock-home.prototype';

// props
const props = defineProps<{ lot: ILotPrototype | null }>();

// emits
const emit = defineEmits<{ close: []; advance: [lot: ILotPrototype, oilKg?: number] }>();

// variables
const oilKg = ref<number | null>(null);

// computed
const isPressingForm = computed((): boolean => props.lot?.status === 'pressing');
const yieldPct = computed((): number | null => (props.lot && oilKg.value ? (oilKg.value / props.lot.netKg) * 100 : null));
const yieldText = computed((): string => (yieldPct.value ? `${yieldPct.value.toFixed(1)} %` : '—'));
const isYieldOdd = computed((): boolean => yieldPct.value !== null && (yieldPct.value < 14 || yieldPct.value > 24));
const remainingStatuses = computed((): LotStatus[] =>
  props.lot ? LOT_STATUSES.slice(LOT_STATUSES.indexOf(props.lot.status) + 1) : [],
);

// watchers
watch(
  () => props.lot?.id,
  () => {
    oilKg.value = null;
  },
);

// event handlers
const handleAdvance = (): void => {
  if (props.lot) emit('advance', props.lot);
};

const handleSubmitOil = (): void => {
  if (props.lot && oilKg.value) emit('advance', props.lot, oilKg.value);
};
</script>
