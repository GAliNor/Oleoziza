<template>
  <div v-if="layout === 'stacked'" class="card flex min-w-0 flex-col divide-y divide-subtle rounded-2xl p-0">
    <div v-for="tile in tiles" :key="tile.key" class="flex items-center justify-between gap-3 px-5 py-3.5">
      <div class="min-w-0">
        <p class="eyebrow">{{ tile.label }}</p>
        <p class="body-two truncate">{{ tile.sub }}</p>
      </div>
      <p class="text-display-xs figure whitespace-nowrap" :class="tile.tone">{{ formatMoneyRounded(tile.value) }}</p>
    </div>
  </div>
  <div v-else class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <component
      :is="isPendingAction(tile.key) ? 'button' : 'div'"
      v-for="tile in tiles"
      :key="tile.key"
      :type="isPendingAction(tile.key) ? 'button' : undefined"
      class="min-w-0 rounded-2xl text-left"
      :class="[isPendingAction(tile.key) ? 'transition hover:ring-2 hover:ring-warning/40' : '', isPendingAction(tile.key) && isActive ? 'ring-2 ring-warning/60' : '']"
      @click="isPendingAction(tile.key) && emit('pending')"
    >
      <ui-stat-tile class="h-full" :label="tile.label" :value="tile.value" :format="formatMoneyRounded" :sub="tile.sub" :value-class="tile.tone" />
    </component>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatMoneyRounded } from 'global/composables/money';
import type { ISalesFigures } from 'finance/types/finance';

import UiStatTile from 'global/components/ui-stat-tile.vue';

// props
const props = withDefaults(defineProps<{ figures: ISalesFigures; periodLabel: string; layout?: 'grid' | 'stacked'; canOpenPending?: boolean; isActive?: boolean }>(), {
  layout: 'grid',
  canOpenPending: false,
  isActive: false,
});

// emits
const emit = defineEmits<{ (event: 'pending'): void }>();

// stores
const { t } = useI18n();

// computed
const tiles = computed(() => [
  { key: 'revenue', label: t('finance.salesTiles.revenue', { period: props.periodLabel }), value: props.figures.revenue, sub: t('finance.salesTiles.revenueSub'), tone: 'text-fg-display' },
  { key: 'collected', label: t('finance.salesTiles.collected'), value: props.figures.collected, sub: share(props.figures.collected), tone: 'text-fg-brand' },
  { key: 'pending', label: t('finance.salesTiles.pending'), value: props.figures.pending, sub: t('finance.salesTiles.pendingSub', { count: props.figures.pendingCount }, props.figures.pendingCount), tone: 'text-fg-warning' },
  { key: 'outstanding', label: t('finance.salesTiles.outstanding'), value: props.figures.outstanding, sub: share(props.figures.outstanding), tone: 'text-fg-warning' },
]);

// methods
const share = (value: number): string => t('finance.salesTiles.share', { percent: Math.round((value / (props.figures.revenue || 1)) * 100) });

const isPendingAction = (key: string): boolean => key === 'pending' && props.canOpenPending;
</script>
