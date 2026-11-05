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
        <dd class="text-display-xs figure">{{ lot.oilLitres ? formatNumber(lot.oilLitres, 1) : '—' }} <span v-if="lot.oilLitres" class="body-two">{{ $t('global.units.litre') }}</span></dd>
        <dd class="body-two">{{ lot.oilLitres ? (lot.tankName ?? $t('lot.detail.clientContainers')) : $t('lot.detail.notPressed') }}</dd>
      </div>
      <div class="card">
        <dt class="eyebrow">{{ $t('lot.register.columns.yield') }}</dt>
        <dd class="text-display-xs figure" :class="isYieldOdd ? 'text-fg-warning' : 'text-fg-brand'">{{ lot.oilLitres ? formatYield(lot.oilLitres, lot.netKg) : '—' }}</dd>
        <dd class="body-two">{{ $t('lot.detail.expectedYield', { min: YIELD_EXPECTED_MIN, max: YIELD_EXPECTED_MAX }) }}</dd>
      </div>
      <div class="card">
        <dt class="eyebrow">{{ $t('lot.detail.fee') }}</dt>
        <template v-if="sessionStore.isBackofficeView">
          <dd class="text-display-xs figure">{{ formatMoney(millingFee(lot)) }}</dd>
          <dd class="body-two truncate">{{ $t('lot.detail.feeRate', { rate: formatMoney(lot.millingRatePerKg) }) }}</dd>
          <dd v-if="lot.paidDh" class="body-two truncate">{{ $t('lot.payment.paidOf', { paid: formatMoney(lot.paidDh), fee: formatMoney(millingFee(lot)) }) }}</dd>
        </template>
        <dd class="mt-1"><lot-payment-chip :lot="lot" /></dd>
        <dd v-if="lot.discount?.state === 'pending'" class="mt-1"><span class="chip bg-warning-subtle text-fg-warning">{{ $t('lot.discount.pendingChip') }}</span></dd>
        <dd v-else-if="lot.discount?.state === 'refused'" class="mt-1"><span class="chip bg-danger-subtle text-fg-danger">{{ $t('lot.discount.refusedChip') }}</span></dd>
      </div>
    </dl>

    <section v-if="documents.length" class="card flex flex-col gap-3">
      <h3 class="label">{{ $t('finance.documents.title') }}</h3>
      <document-list :documents="documents" empty-message="" />
    </section>

    <section class="card flex flex-col gap-3">
      <h3 class="label">{{ $t('lot.detail.timeline') }}</h3>
      <ol class="relative flex flex-col gap-3 border-s-2 border-brand ps-5">
        <lot-timeline-step v-for="(step, index) in steps" :key="`${lot.id}-${step.key}-${index}`" :step="step" />
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useFinanceStore } from 'finance/stores/finance';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { millingFee } from 'lot/composables/fee';
import { buildLotTimeline } from 'lot/composables/timeline';
import { formatBoxes, holdsBox } from 'lot/composables/lot-boxes';
import { formatQuintals, formatYield, yieldPerQuintal } from 'lot/composables/quantity';
import { formatMoney } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';
import { formatShortDate } from 'global/composables/date';
import { LOT_STATUS_TONES, YIELD_EXPECTED_MAX, YIELD_EXPECTED_MIN } from 'lot/constants/lot';
import type { IPaymentDocument } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

import LotTimelineStep from 'lot/components/lot-timeline-step.vue';
import LotPaymentChip from 'lot/components/lot-payment-chip.vue';
import DocumentList from 'finance/components/document-list.vue';

// props
const props = defineProps<{ lot: ILot }>();

// stores
const financeStore = useFinanceStore();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();

// computed
const siteName = computed((): string => siteStore.sites.find((site) => site.id === props.lot.siteId)?.name ?? '—');
const steps = computed(() => buildLotTimeline(props.lot));
const documents = computed((): IPaymentDocument[] =>
  siteStore.can('finance.view') ? financeStore.movements.filter((movement) => movement.lotLinks.some((link) => link.lotId === props.lot.id)).flatMap((movement) => movement.documents) : [],
);

// lifecycle
if (siteStore.can('finance.view') && props.lot.siteId) financeStore.fetchMovements(siteStore.currentSiteId ?? props.lot.siteId);
const isYieldOdd = computed((): boolean => {
  if (!props.lot.oilLitres) return false;
  const litresPerQuintal = yieldPerQuintal(props.lot.oilLitres, props.lot.netKg);
  return litresPerQuintal < YIELD_EXPECTED_MIN || litresPerQuintal > YIELD_EXPECTED_MAX;
});
</script>
