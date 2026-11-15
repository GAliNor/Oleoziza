<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <ui-stat-tile
      v-for="tile in tiles"
      :key="tile.key"
      :label="tile.label"
      :value="tile.value"
      :format="formatMoneyRounded"
      :sub="tile.sub"
      :value-class="tile.tone"
      :class="{ 'col-span-2 sm:col-span-1': tile.key === 'operating' }"
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
const tiles = computed(() => [
  { key: 'operating', label: t('expense.tiles.operating', { period: props.periodLabel }), value: props.summary.operating, sub: t('expense.tiles.countSub', { count: props.summary.count }, props.summary.count), tone: 'text-fg-display' },
  { key: 'investments', label: t('expense.tiles.investments'), value: props.summary.investments, sub: t('expense.tiles.investmentsSub'), tone: 'text-fg-primary-paragraph' },
  { key: 'vat', label: t('expense.tiles.vat'), value: props.summary.vat, sub: t('expense.tiles.vatSub'), tone: 'text-fg-brand' },
]);
</script>
