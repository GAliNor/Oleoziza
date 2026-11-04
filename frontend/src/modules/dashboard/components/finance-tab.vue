<template>
  <div v-if="!sales || !figures" class="skeleton h-64 rounded-card" />
  <div v-else class="stagger flex min-w-0 flex-col gap-5">
    <sales-tiles :figures="figures" :period-label="period.label" />

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <ui-bar-chart :title="$t(sales.chartTitleKey)" :series="salesSeries" :bars="chartBars" class="lg:col-span-3">
        <template #tooltip="{ bar }">
          <p>{{ $t('dashboard.management.sales.revenue', { amount: formatMoneyRounded(bar.values.revenue) }) }}</p>
          <p>{{ $t('dashboard.management.sales.collected', { amount: formatMoneyRounded(bar.values.collected) }) }}</p>
        </template>
      </ui-bar-chart>
      <div class="card flex min-w-0 flex-col gap-4 p-5 lg:col-span-2">
        <h2 class="heading-four">{{ $t('dashboard.management.sales.byMethod') }}</h2>
        <div class="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
          <div class="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 42 42" class="h-full w-full -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="none" class="stroke-neutral-100" stroke-width="6" />
              <circle
                v-for="(slice, index) in slices"
                :key="slice.key"
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                class="slice transition-[stroke-width] duration-300"
                :stroke="PAYMENT_METHOD_COLORS[slice.key]"
                :stroke-width="hoveredKey === slice.key ? 7.5 : 6"
                :stroke-dasharray="`${slice.pct} ${100 - slice.pct}`"
                :stroke-dashoffset="-slice.offset"
                :style="{ animationDelay: `${index * 90}ms` }"
                @mouseenter="hoveredKey = slice.key"
                @mouseleave="hoveredKey = null"
              />
            </svg>
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p class="body-three">{{ hovered ? $t(`finance.methods.${hovered.key}`) : $t('finance.salesTiles.collected') }}</p>
              <p class="text-lg figure">{{ formatMoneyRounded(hovered ? hovered.amount : figures.collected) }}</p>
            </div>
          </div>
          <ul class="flex w-full flex-col gap-2 text-sm">
            <li
              v-for="slice in slices"
              :key="slice.key"
              class="flex items-center justify-between gap-3 rounded-lg px-2 py-1"
              :class="{ 'bg-page': hoveredKey === slice.key }"
              @mouseenter="hoveredKey = slice.key"
              @mouseleave="hoveredKey = null"
            >
              <span class="flex items-center gap-2 text-fg-primary-paragraph"><span class="h-2.5 w-2.5 rounded-full" :style="{ background: PAYMENT_METHOD_COLORS[slice.key] }" /> {{ $t(`finance.methods.${slice.key}`) }}</span>
              <span class="tabular-nums text-fg-secondary-paragraph">{{ formatNumber(slice.pct) }} %</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useFinance } from 'finance/composables/use-finance';
import { PAYMENT_METHOD_COLORS } from 'finance/constants/finance';
import type { PaymentMethodKey } from 'finance/types/finance';
import type { IPeriod } from 'global/types/period';
import { formatMoneyRounded } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';

import type { IChartSeries } from 'global/types/chart';

import SalesTiles from 'finance/components/sales-tiles.vue';
import UiBarChart from 'global/components/ui-bar-chart.vue';

// props
defineProps<{ period: IPeriod }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const { figures } = useFinance();

// variables
const hoveredKey = ref<PaymentMethodKey | null>(null);

// computed
const sales = computed(() => financeStore.sales);
const salesSeries = computed((): IChartSeries[] => [
  { key: 'revenue', label: t('dashboard.management.sales.revenueLegend'), colorClass: 'bg-primary-olive-light', hoverClass: 'bg-primary-olive-mid' },
  { key: 'collected', label: t('finance.salesTiles.collected'), colorClass: 'bg-primary-olive-dark' },
]);
const chartBars = computed(() => (sales.value?.bars ?? []).map((bar) => ({ label: bar.label, values: { revenue: bar.revenue, collected: bar.collected }, isCurrent: bar.isCurrent })));
const slices = computed(() => {
  const methods = sales.value?.methods ?? [];
  const total = methods.reduce((sum, method) => sum + method.amount, 0) || 1;
  let offset = 0;
  return methods.map((method) => {
    const pct = (method.amount / total) * 100;
    const slice = { ...method, pct, offset };
    offset += pct;
    return slice;
  });
});
const hovered = computed(() => slices.value.find((slice) => slice.key === hoveredKey.value));
</script>

<style scoped>
.slice {
  animation: slice-in 700ms var(--ease-premium) backwards;
}

@keyframes slice-in {
  from {
    stroke-dasharray: 0 100;
  }
}

@media (prefers-reduced-motion: reduce) {
  .slice {
    animation: none;
  }
}
</style>
