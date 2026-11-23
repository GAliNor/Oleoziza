<template>
  <div class="@container stagger flex min-w-0 flex-col gap-6">
    <header class="flex flex-col gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <p class="eyebrow">{{ $t('lot.detail.heading', { code: lot.code, site: siteName, date: formatShortDate(lot.receivedAt) }) }}</p>
        <h2 class="heading-four">{{ lot.clientName }}</h2>
        <p class="body-two">{{ $t('lot.detail.recordedBy', { variety: lot.variety, name: lot.receivedBy }) }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="holdsBox(lot)" class="chip bg-selected text-fg-brand tabular-nums">{{ formatBoxes(lot.boxNumbers) }}</span>
        <span v-else-if="lot.status === 'waiting'" class="chip bg-warning-subtle text-fg-warning">{{ $t('lot.box.none') }}</span>
        <span v-if="lineLabel && (lot.status === 'waiting' || lot.status === 'pressing')" class="chip bg-accent-subtle text-fg-accent tabular-nums">
          {{ lineLabel }}<template v-if="lot.status === 'waiting' && lot.plannedStartAt"> · {{ $t('lot.detail.plannedAt', { at: formatDateTime(lot.plannedStartAt) }) }}</template>
        </span>
        <span class="chip" :class="LOT_STATUS_TONES[lot.status]">{{ $t(`lot.status.${lot.status}`) }}</span>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4">
      <div class="card flex flex-col gap-1">
        <dt class="eyebrow">{{ $t('lot.register.columns.olives') }}</dt>
        <dd class="text-display-xs figure">{{ formatNumber(lot.netKg, 1) }} <span class="body-two">{{ $t('global.units.kilogram') }}</span></dd>
        <dd class="body-two">{{ formatQuintals(lot.netKg) }}</dd>
      </div>
      <div class="card flex flex-col gap-1">
        <dt class="eyebrow">{{ $t('lot.register.columns.oil') }}</dt>
        <dd class="text-display-xs figure">{{ lot.oilLitres ? formatNumber(lot.oilLitres, 1) : '—' }} <span v-if="lot.oilLitres" class="body-two">{{ $t('global.units.litre') }}</span></dd>
        <dd class="body-two">{{ oilWhere }}</dd>
      </div>
      <div class="card flex flex-col gap-1">
        <dt class="eyebrow">{{ $t('lot.register.columns.yield') }}</dt>
        <dd class="text-display-xs figure" :class="isYieldOdd ? 'text-fg-warning' : 'text-fg-brand'">{{ lot.oilLitres ? formatYield(lot.oilLitres, lot.netKg) : '—' }}</dd>
        <dd class="body-two">{{ $t('lot.detail.expectedYield', { min: YIELD_EXPECTED_MIN, max: YIELD_EXPECTED_MAX }) }}</dd>
      </div>
      <div class="card flex flex-col gap-1">
        <dt class="eyebrow">{{ $t('lot.detail.fee') }}</dt>
        <template v-if="siteStore.can(AMOUNT_PERMISSIONS)">
          <dd class="text-display-xs figure">{{ formatMoney(millingFee(lot)) }}</dd>
          <dd class="body-two">{{ $t('lot.detail.feeRate', { rate: formatMoney(lot.millingRatePerKg) }) }}</dd>
          <dd v-if="lot.paidDh" class="body-two">{{ $t('lot.payment.paidOf', { paid: formatMoney(lot.paidDh), fee: formatMoney(millingFee(lot)) }) }}</dd>
        </template>
        <dd class="mt-1"><lot-payment-chip :lot="lot" /></dd>
        <dd v-if="lot.discount?.state === 'pending'" class="mt-1"><span class="chip bg-warning-subtle text-fg-warning">{{ $t('lot.discount.pendingChip') }}</span></dd>
        <dd v-else-if="lot.discount?.state === 'refused'" class="mt-1"><span class="chip bg-danger-subtle text-fg-danger">{{ $t('lot.discount.refusedChip') }}</span></dd>
      </div>
    </dl>

    <lot-money v-if="isMoneyShownComputed" :lot="lot" />

    <section class="card flex flex-col gap-4 p-5">
      <h3 class="label">{{ $t('lot.detail.timeline') }}</h3>
      <ol class="relative flex flex-col gap-4 border-s-2 border-brand ps-5">
        <lot-timeline-step v-for="(step, index) in steps" :key="`${lot.id}-${step.key}-${index}`" :step="step" />
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { millingFee } from 'lot/composables/fee';
import { buildLotTimeline } from 'lot/composables/timeline';
import { formatBoxes, holdsBox } from 'lot/composables/lot-boxes';
import { formatLitres, formatQuintals, formatYield, yieldPerQuintal } from 'lot/composables/quantity';
import { isStorageActive, storedLeft } from 'lot/composables/storage';
import { formatMoney } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';
import { formatDateTime, formatShortDate } from 'global/composables/date';
import { useSiteEquipment } from 'configuration/composables/use-site-equipment';
import { formatPressLine, formatTank } from 'configuration/composables/equipment';
import { LOT_STATUS_TONES, YIELD_EXPECTED_MAX, YIELD_EXPECTED_MIN } from 'lot/constants/lot';
import { AMOUNT_PERMISSIONS } from 'finance/constants/finance';
import type { ILot } from 'lot/types/lot';

import LotTimelineStep from 'lot/components/lot-timeline-step.vue';
import LotPaymentChip from 'lot/components/lot-payment-chip.vue';
import LotMoney from 'lot/components/lot-money.vue';

// props
const props = defineProps<{ lot: ILot }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const lotStore = useLotStore();
const siteStore = useSiteStore();

// computed
const siteName = computed((): string => siteStore.sites.find((site) => site.id === props.lot.siteId)?.name ?? '—');
const { pressLines, tanks } = useSiteEquipment(() => props.lot.siteId);
const tankName = (tankId: string): string => {
  const tank = tanks.value.find((item) => item.id === tankId);
  return tank ? formatTank(tank) : tankId;
};
const lineLabel = computed((): string | null => {
  const line = pressLines.value.find((item) => item.id === props.lot.pressLineId);
  return line ? formatPressLine(line) : null;
});
const oilWhere = computed((): string => {
  if (!props.lot.oilLitres) return t('lot.detail.notPressed');
  const active = props.lot.storages.filter(isStorageActive);
  if (!active.length) return t(props.lot.storages.length ? 'lot.status.withdrawn' : 'lot.detail.handedOver');
  return active.map((storage) => `${tankName(storage.tankId)} · ${formatLitres(storedLeft(storage))}`).join(', ');
});
const steps = computed(() =>
  buildLotTimeline({ ...props.lot, stepPhotos: { ...lotStore.photosByLot[props.lot.id], ...props.lot.stepPhotos } }, {
    lineLabel: lineLabel.value,
    tankLabel: tankName,
    isMoneyShown: siteStore.can(AMOUNT_PERMISSIONS),
  }),
);
const isMoneyShownComputed = computed((): boolean => props.lot.mode === 'service_milling' && siteStore.can(AMOUNT_PERMISSIONS));

// watchers
watch(
  () => `${props.lot.id}:${props.lot.photoSteps?.join() ?? ''}`,
  () => lotStore.fetchPhotos(props.lot),
  { immediate: true },
);

// lifecycle
if (siteStore.can('finance.view') && props.lot.siteId) financeStore.fetchMovements(siteStore.currentSiteId ?? props.lot.siteId);
const isYieldOdd = computed((): boolean => {
  if (!props.lot.oilLitres) return false;
  const litresPerQuintal = yieldPerQuintal(props.lot.oilLitres, props.lot.netKg);
  return litresPerQuintal < YIELD_EXPECTED_MIN || litresPerQuintal > YIELD_EXPECTED_MAX;
});
</script>
