<template>
  <div class="stagger flex flex-col gap-4">
    <header class="flex flex-wrap items-start gap-3">
      <div class="min-w-0 flex-1">
        <p class="eyebrow">{{ $t('lot.detail.heading', { code: lot.code, site: siteName, date: formatShortDate(lot.receivedAt) }) }}</p>
        <h2 class="heading-four">{{ lot.clientName }}</h2>
        <p class="body-two">{{ $t('lot.detail.recordedBy', { variety: lot.variety, name: lot.receivedBy }) }}</p>
      </div>
      <span v-if="holdsBox(lot)" class="chip bg-selected text-fg-brand tabular-nums">{{ formatBoxes(lot.boxNumbers) }}</span>
      <span class="chip" :class="LOT_STATUS_TONES[lot.status]">{{ $t(`lot.status.${lot.status}`) }}</span>
    </header>

    <dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="card">
        <dt class="eyebrow">{{ $t('lot.register.columns.olives') }}</dt>
        <dd class="text-display-xs figure">{{ formatNumber(lot.netKg, 1) }} <span class="body-two">{{ $t('global.units.kilogram') }}</span></dd>
        <dd class="body-two">{{ formatQuintals(lot.netKg) }}</dd>
      </div>
      <div class="card">
        <dt class="eyebrow">{{ $t('lot.register.columns.oil') }}</dt>
        <dd class="text-display-xs figure">{{ lot.oilKg ? formatNumber(lot.oilKg, 1) : '—' }} <span v-if="lot.oilKg" class="body-two">{{ $t('global.units.kilogram') }}</span></dd>
        <dd class="body-two">{{ lot.oilKg ? `${formatLitres(lot.oilKg)} · ${lot.tankName ?? $t('lot.detail.clientContainers')}` : $t('lot.detail.notPressed') }}</dd>
      </div>
      <div class="card">
        <dt class="eyebrow">{{ $t('lot.register.columns.yield') }}</dt>
        <dd class="text-display-xs figure" :class="isYieldOdd ? 'text-fg-warning' : 'text-fg-brand'">{{ lot.oilKg ? formatYield(lot.oilKg, lot.netKg) : '—' }}</dd>
        <dd class="body-two">{{ lot.oilKg ? $t('lot.detail.perQuintal', { kg: Math.round((lot.oilKg / lot.netKg) * 100) }) : $t('lot.detail.expectedYield') }}</dd>
      </div>
      <div class="card">
        <dt class="eyebrow">{{ $t('lot.detail.fee') }}</dt>
        <dd class="text-display-xs figure">{{ formatMoney(lot.netKg * MILLING_RATE) }}</dd>
        <dd class="body-two truncate">{{ $t('lot.detail.feeRate', { rate: formatMoney(MILLING_RATE) }) }}</dd>
      </div>
    </dl>

    <section class="card flex flex-col gap-3">
      <h3 class="label">{{ $t('lot.detail.timeline') }}</h3>
      <ol class="relative flex flex-col gap-3 border-l-2 border-brand pl-5">
        <lot-timeline-step v-for="step in steps" :key="`${lot.id}-${step.key}`" :step="step" />
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useSiteStore } from 'site/stores/site';
import { buildLotTimeline } from 'lot/composables/timeline';
import { formatBoxes, holdsBox } from 'lot/composables/lot-boxes';
import { formatLitres, formatQuintals, formatYield } from 'lot/composables/quantity';
import { formatMoney } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';
import { formatShortDate } from 'global/composables/date';
import { LOT_STATUS_TONES, MILLING_RATE, YIELD_EXPECTED_MAX, YIELD_EXPECTED_MIN } from 'lot/constants/lot';
import type { ILot } from 'lot/types/lot';

import LotTimelineStep from 'lot/components/lot-timeline-step.vue';

// props
const props = defineProps<{ lot: ILot }>();

// stores
const siteStore = useSiteStore();

// computed
const siteName = computed((): string => siteStore.sites.find((site) => site.id === props.lot.siteId)?.name ?? '—');
const steps = computed(() => buildLotTimeline(props.lot));
const isYieldOdd = computed((): boolean => {
  if (!props.lot.oilKg) return false;
  const yieldPct = (props.lot.oilKg / props.lot.netKg) * 100;
  return yieldPct < YIELD_EXPECTED_MIN || yieldPct > YIELD_EXPECTED_MAX;
});
</script>
