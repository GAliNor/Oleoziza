<template>
  <div class="stagger flex min-w-0 flex-col gap-5">
    <sales-tiles :figures="sales" :period-label="period.label" />

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <ui-bar-chart :title="chart.title" :series="SALES_SERIES" :bars="chartBars" class="lg:col-span-3">
        <template #tooltip="{ bar }">
          <p>CA {{ formatMoneyRounded(bar.values.revenue) }}</p>
          <p>Encaissé {{ formatMoneyRounded(bar.values.collected) }}</p>
        </template>
      </ui-bar-chart>
      <div class="card flex min-w-0 flex-col gap-4 rounded-2xl p-5 lg:col-span-2">
        <h2 class="heading-four">Encaissé par mode</h2>
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
                :stroke="slice.tone"
                :stroke-width="hoveredKey === slice.key ? 7.5 : 6"
                :stroke-dasharray="`${slice.pct} ${100 - slice.pct}`"
                :stroke-dashoffset="-slice.offset"
                :style="{ animationDelay: `${index * 90}ms` }"
                @mouseenter="hoveredKey = slice.key"
                @mouseleave="hoveredKey = null"
              />
            </svg>
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p class="body-three">{{ hovered ? hovered.label : 'Encaissé' }}</p>
              <p class="text-lg figure">{{ formatMoneyRounded(hovered ? hovered.amount : sales.collected) }}</p>
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
              <span class="flex items-center gap-2 text-fg-primary-paragraph"><span class="h-2.5 w-2.5 rounded-full" :style="{ background: slice.tone }" /> {{ slice.label }}</span>
              <span class="tabular-nums text-fg-secondary-paragraph">{{ formatNumber(slice.pct) }} %</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — "Finances" tab v2, variant A of ticket 0029: sales tiles, CA vs Encaissé bars, Encaissé by payment method as a donut.
// imports
import { computed, ref } from 'vue';

import { PAYMENT_METHODS, salesBars, salesFigures, type PaymentMethodKey } from 'dashboard/prototype/mock-home.prototype';
import { MOCK_PERIOD_FACTORS } from 'global/constants/period';
import type { IPeriod } from 'global/types/period';
import { formatMoneyRounded } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';

import type { IChartSeries } from 'global/types/chart';

import SalesTiles from 'finance/components/sales-tiles.vue';
import UiBarChart from 'global/components/ui-bar-chart.vue';

// props
const props = defineProps<{ period: IPeriod; scale: number }>();

// variables
const SALES_SERIES: IChartSeries[] = [
  { key: 'revenue', label: 'CA', colorClass: 'bg-primary-olive-light', hoverClass: 'bg-primary-olive-mid' },
  { key: 'collected', label: 'Encaissé', colorClass: 'bg-primary-olive-dark' },
];
const hoveredKey = ref<PaymentMethodKey | null>(null);
const methodTotal = PAYMENT_METHODS.reduce((sum, method) => sum + method.amount, 0);

// computed
const sales = computed(() => salesFigures(props.scale * MOCK_PERIOD_FACTORS[props.period.key]));
const chart = computed(() => salesBars(props.period.key, props.scale));
const chartBars = computed(() => chart.value.bars.map((bar) => ({ label: bar.label, values: { revenue: bar.revenue, collected: bar.collected }, isCurrent: bar.isCurrent })));
const slices = computed(() => {
  let offset = 0;
  return PAYMENT_METHODS.map((method) => {
    const pct = (method.amount / methodTotal) * 100;
    const slice = { ...method, amount: (method.amount / methodTotal) * sales.value.collected, pct, offset };
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
