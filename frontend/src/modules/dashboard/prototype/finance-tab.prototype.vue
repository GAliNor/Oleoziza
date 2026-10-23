<template>
  <div class="stagger flex min-w-0 flex-col gap-5">
    <money-tiles :figures="sales" :period="period" />

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <sales-bars :title="chart.title" :bars="chart.bars" class="lg:col-span-3" />
      <div class="card flex min-w-0 flex-col gap-4 rounded-2xl p-5 lg:col-span-2">
        <h2 class="heading-two">Encaissé par mode</h2>
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
              <p class="text-xs text-neutral-500">{{ hovered ? hovered.label : 'Encaissé' }}</p>
              <p class="text-lg font-semibold tabular-nums">{{ formatDh(hovered ? hovered.amount : sales.collected) }}</p>
            </div>
          </div>
          <ul class="flex w-full flex-col gap-2 text-sm">
            <li
              v-for="slice in slices"
              :key="slice.key"
              class="flex items-center justify-between gap-3 rounded-lg px-2 py-1"
              :class="{ 'bg-neutral-50': hoveredKey === slice.key }"
              @mouseenter="hoveredKey = slice.key"
              @mouseleave="hoveredKey = null"
            >
              <span class="flex items-center gap-2 text-neutral-700"><span class="h-2.5 w-2.5 rounded-full" :style="{ background: slice.tone }" /> {{ slice.label }}</span>
              <span class="tabular-nums text-neutral-500">{{ slice.pct.toFixed(0) }} %</span>
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

import { formatDh, PAYMENT_METHODS, salesBars, salesFigures, type PaymentMethodKey } from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';

import MoneyTiles from 'dashboard/prototype/money-tiles.prototype.vue';
import SalesBars from 'dashboard/prototype/sales-bars.prototype.vue';

// props
const props = defineProps<{ period: IPeriodPrototype; scale: number }>();

// variables
const hoveredKey = ref<PaymentMethodKey | null>(null);
const methodTotal = PAYMENT_METHODS.reduce((sum, method) => sum + method.amount, 0);

// computed
const sales = computed(() => salesFigures(props.scale * props.period.factor));
const chart = computed(() => salesBars(props.period.key, props.scale));
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
