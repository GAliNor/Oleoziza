<template>
  <div class="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
    <ui-stat-tile
      v-for="tile in tiles"
      :key="tile.key"
      :label="tile.label"
      :value="tile.value"
      :format="formatMoneyRounded"
      :sub="tile.sub"
      :value-class="tile.tone"
    />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatMoneyRounded } from 'global/composables/money';
import type { IExpenseSummary } from 'expense/types/expense';

import UiStatTile from 'global/components/ui-stat-tile.vue';

// props
const props = defineProps<{ summary: IExpenseSummary; periodLabel: string }>();

// stores
const { t } = useI18n();

// computed
const toPaySubComputed = computed((): string => {
  const { count, lateCount, unknownAmountCount } = props.summary.toPay;
  if (!count) return t('expense.tiles.toPayNone');
  const parts = [t('expense.tiles.toPayCount', { count }, count)];
  if (lateCount) parts.push(t('expense.tiles.toPayLate', { count: lateCount }, lateCount));
  if (unknownAmountCount) parts.push(t('expense.tiles.toPayUnknown', { count: unknownAmountCount }, unknownAmountCount));
  return parts.join(' · ');
});
const tiles = computed(() => [
  { key: 'operating', label: t('expense.tiles.operating', { period: props.periodLabel }), value: props.summary.operating, sub: t('expense.tiles.countSub', { count: props.summary.count }, props.summary.count), tone: 'text-fg-display' },
  { key: 'investments', label: t('expense.tiles.investments'), value: props.summary.investments, sub: t('expense.tiles.investmentsSub'), tone: 'text-fg-primary-paragraph' },
  { key: 'toPay', label: t('expense.tiles.toPay'), value: props.summary.toPay.amount, sub: toPaySubComputed.value, tone: props.summary.toPay.lateCount ? 'text-fg-danger' : 'text-fg-warning' },
  { key: 'vat', label: t('expense.tiles.vat'), value: props.summary.vat, sub: t('expense.tiles.vatSub'), tone: 'text-fg-brand' },
]);
</script>
