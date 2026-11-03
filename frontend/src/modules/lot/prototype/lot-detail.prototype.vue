<template>
  <!-- PROTOTYPE: one Lot for Management (ticket 0036): its figures and its Lot Timeline. -->
  <div class="stagger flex flex-col gap-4">
    <header class="flex flex-wrap items-start gap-3">
      <div class="min-w-0 flex-1">
        <p class="eyebrow">{{ lot.code }} · {{ siteName(lot.siteId) }} · reçu le {{ formatDate(lot.receivedAt) }}</p>
        <h2 class="heading-two">{{ lot.client }}</h2>
        <p class="body-two">{{ lot.variety }} · saisi par {{ lot.operator }}</p>
      </div>
      <span class="chip" :class="LOT_STATUS_CLASSES[lot.status]">{{ STATUS_LABELS[lot.status] }}</span>
    </header>

    <dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="card rounded-2xl">
        <dt class="eyebrow text-fg-secondary-paragraph">Olives</dt>
        <dd class="text-2xl font-semibold tabular-nums">{{ lot.netKg.toLocaleString('fr-FR') }} <span class="text-sm text-fg-secondary-paragraph">kg</span></dd>
        <dd class="body-two">{{ (lot.netKg / 100).toLocaleString('fr-FR') }} quintaux</dd>
      </div>
      <div class="card rounded-2xl">
        <dt class="eyebrow text-fg-secondary-paragraph">Huile</dt>
        <dd class="text-2xl font-semibold tabular-nums">{{ lot.oilKg?.toLocaleString('fr-FR') ?? '—' }} <span v-if="lot.oilKg" class="text-sm text-fg-secondary-paragraph">kg</span></dd>
        <dd class="body-two">{{ lot.oilKg ? `${formatLitres(lot.oilKg)} · ${lot.tank ?? 'bidons du Client'}` : 'pas encore pressé' }}</dd>
      </div>
      <div class="card rounded-2xl">
        <dt class="eyebrow text-fg-secondary-paragraph">Rendement</dt>
        <dd class="text-2xl font-semibold tabular-nums" :class="isYieldOdd ? 'text-fg-warning' : 'text-fg-brand'">{{ yieldText }}</dd>
        <dd class="body-two">{{ lot.oilKg ? `${Math.round((lot.oilKg / lot.netKg) * 100)} kg par quintal` : 'attendu 12–24 %' }}</dd>
      </div>
      <div class="card rounded-2xl">
        <dt class="eyebrow text-fg-secondary-paragraph">Frais</dt>
        <dd class="text-2xl font-semibold tabular-nums">{{ formatDh(moneyOf(lot).amount) }}</dd>
        <dd class="body-two truncate">{{ moneyOf(lot).label }}</dd>
      </div>
    </dl>

    <section class="card flex flex-col gap-3 rounded-2xl">
      <h3 class="label">Parcours du lot</h3>
      <ol class="relative flex flex-col gap-4 border-l-2 border-brand pl-5">
        <li v-for="step in lot.steps" :key="step.key" class="relative">
          <span class="absolute top-1 -left-[27px] h-3 w-3 rounded-full bg-primary-olive-mid ring-4 ring-surface" />
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="font-medium text-fg-display">{{ step.label }}</p>
            <p class="body-two tabular-nums">{{ formatTime(step.at) }}</p>
          </div>
          <p class="body-two">{{ step.detail }}</p>
          <p class="text-xs text-fg-muted">par {{ step.by }}</p>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { STATUS_LABELS, formatDh, formatLitres, type LotStatus } from 'dashboard/prototype/mock-home.prototype';
import { moneyOf, type ILotRecordPrototype } from 'lot/prototype/mock-lots.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

// props
const props = defineProps<{ lot: ILotRecordPrototype }>();

// stores
const { siteName } = useLotsPrototype();

// variables
const LOT_STATUS_CLASSES: Record<LotStatus, string> = {
  received: 'bg-info-subtle text-fg-info',
  waiting: 'bg-warning-subtle text-fg-warning',
  pressing: 'bg-warning-subtle text-fg-warning',
  pressed: 'bg-selected text-fg-brand',
  withdrawn: 'bg-emphasis text-fg-primary-paragraph',
};

// computed
const yieldRate = computed((): number | null => (props.lot.oilKg ? (props.lot.oilKg / props.lot.netKg) * 100 : null));
const yieldText = computed((): string => (yieldRate.value === null ? '—' : `${yieldRate.value.toFixed(1).replace('.', ',')} %`));
const isYieldOdd = computed((): boolean => yieldRate.value !== null && (yieldRate.value < 12 || yieldRate.value > 24));

// methods
const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
</script>
