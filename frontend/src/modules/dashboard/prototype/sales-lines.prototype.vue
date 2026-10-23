<template>
  <div class="card flex min-w-0 flex-col gap-4 rounded-2xl p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="heading-two">{{ title }} (cumulés)</h2>
      <div class="flex items-center gap-3 text-xs text-neutral-600">
        <span class="flex items-center gap-1.5"><span class="h-0.5 w-4 bg-primary-olive-mid" /> CA</span>
        <span class="flex items-center gap-1.5"><span class="h-0.5 w-4 bg-primary-olive-dark" /> Encaissé</span>
        <span class="flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-sm bg-accent-rust/15" /> Écart</span>
      </div>
    </div>
    <div class="relative" @mouseleave="hoveredIndex = null">
      <svg :key="points.revenue" viewBox="0 0 300 120" preserveAspectRatio="none" class="h-44 w-full overflow-visible">
        <line v-for="step in 4" :key="step" x1="0" x2="300" :y1="step * 30" :y2="step * 30" class="stroke-neutral-100" stroke-width="1" vector-effect="non-scaling-stroke" />
        <polygon :points="gapArea" class="fill-accent-rust/15" />
        <polyline :points="points.revenue" fill="none" class="draw stroke-primary-olive-mid" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
        <polyline :points="points.collected" fill="none" class="draw stroke-primary-olive-dark" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
        <line v-if="hoveredIndex !== null" :x1="xOf(hoveredIndex)" :x2="xOf(hoveredIndex)" y1="0" y2="120" class="stroke-neutral-300" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>
      <div class="absolute inset-0 flex">
        <div v-for="(item, index) in series" :key="item.label" class="flex-1" tabindex="0" @mouseenter="hoveredIndex = index" @focus="hoveredIndex = index" />
      </div>
      <Transition name="fade-step">
        <div
          v-if="hoveredIndex !== null"
          class="pointer-events-none absolute -top-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
          :style="{ left: `clamp(0px, calc(${(xOf(hoveredIndex) / 300) * 100}% - 75px), calc(100% - 160px))` }"
        >
          <p class="font-semibold">{{ series[hoveredIndex].label }}</p>
          <p>CA {{ formatDh(series[hoveredIndex].revenue) }}</p>
          <p>Encaissé {{ formatDh(series[hoveredIndex].collected) }}</p>
          <p class="text-accent-gold">Écart {{ formatDh(series[hoveredIndex].revenue - series[hoveredIndex].collected) }}</p>
        </div>
      </Transition>
    </div>
    <div class="flex justify-between border-t border-neutral-200 pt-2">
      <p v-for="bar in bars" :key="bar.label" class="text-xs" :class="bar.isCurrent ? 'font-semibold text-primary-olive-dark' : 'text-neutral-500'">{{ bar.label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — cumulative CA and Encaissé as two lines with the gap shaded (ticket 0028, variant C).
// imports
import { computed, ref } from 'vue';

import { formatDh, type ISalesBarPrototype } from 'dashboard/prototype/mock-home.prototype';

// props
const props = defineProps<{ title: string; bars: ISalesBarPrototype[] }>();

// variables
const hoveredIndex = ref<number | null>(null);

// computed
const series = computed((): ISalesBarPrototype[] => {
  let revenue = 0;
  let collected = 0;
  return props.bars.map((bar) => {
    revenue += bar.revenue;
    collected += bar.collected;
    return { ...bar, revenue, collected };
  });
});
const maxValue = computed((): number => Math.max(...series.value.map((item) => item.revenue), 1) * 1.08);
const points = computed(() => ({
  revenue: series.value.map((item, index) => `${xOf(index)},${yOf(item.revenue)}`).join(' '),
  collected: series.value.map((item, index) => `${xOf(index)},${yOf(item.collected)}`).join(' '),
}));
const gapArea = computed((): string => {
  const top = series.value.map((item, index) => `${xOf(index)},${yOf(item.revenue)}`);
  const bottom = series.value.map((item, index) => `${xOf(index)},${yOf(item.collected)}`).reverse();
  return [...top, ...bottom].join(' ');
});

// methods
const xOf = (index: number): number => (series.value.length > 1 ? (index / (series.value.length - 1)) * 300 : 150);
const yOf = (value: number): number => 120 - (value / maxValue.value) * 120;
</script>

<style scoped>
.draw {
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: draw 900ms var(--ease-premium) forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .draw {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
