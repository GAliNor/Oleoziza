<template>
  <div class="card flex min-w-0 flex-col gap-4 p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="heading-four">{{ title }}</h2>
      <p v-if="unit" class="body-two">{{ unit }}</p>
      <div v-if="legend.length" class="flex items-center gap-3 body-three text-fg-primary-paragraph">
        <span v-for="item in legend" :key="item.key" class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" :class="item.colorClass" /> {{ item.label }}</span>
      </div>
    </div>
    <div class="relative min-h-44 flex-1" @mouseleave="hoveredIndex = null">
      <div :key="barsKey" class="absolute inset-0 flex items-end gap-2">
        <div
          v-for="(bar, index) in bars"
          :key="bar.label"
          class="flex h-full flex-1 cursor-default items-end justify-center gap-0.5"
          tabindex="0"
          @mouseenter="hoveredIndex = index"
          @focus="hoveredIndex = index"
        >
          <div
            v-for="(item, seriesIndex) in series"
            :key="item.key"
            class="grow-y rounded-t-sm transition-colors duration-300"
            :class="[series.length > 1 ? 'w-1/2 max-w-6' : 'w-full', barClass(item, bar, index)]"
            :style="{ height: `${((bar.values[item.key] ?? 0) / maxValue) * 100}%`, animationDelay: `${index * 45 + seriesIndex * 30}ms` }"
          />
        </div>
      </div>
      <Transition name="fade-step">
        <div
          v-if="hoveredBar"
          class="pointer-events-none absolute -top-2 rounded-lg bg-neutral-900 px-3 py-2 body-three whitespace-nowrap text-white shadow-overlay transition-[left] duration-300 ease-(--ease-premium)"
          :style="{ left: `clamp(0px, calc(${((hoveredIndex ?? 0) + 0.5) * (100 / bars.length)}% - 70px), calc(100% - 150px))` }"
        >
          <p class="font-semibold">{{ hoveredBar.label }}</p>
          <slot name="tooltip" :bar="hoveredBar" />
        </div>
      </Transition>
    </div>
    <div class="flex gap-2 border-t border-default pt-2">
      <p v-for="bar in bars" :key="bar.label" class="flex-1 text-center text-xs" :class="bar.isCurrent ? 'font-semibold text-fg-brand' : 'text-fg-secondary-paragraph'">
        {{ bar.label }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts" generic="B extends IChartBar">
// imports
import { computed, ref } from 'vue';

import type { IChartBar, IChartSeries } from 'global/types/chart';

// props
const props = defineProps<{ title: string; unit?: string; series: IChartSeries[]; bars: B[] }>();

// variables
const hoveredIndex = ref<number | null>(null);

// computed
const legend = computed((): IChartSeries[] => props.series.filter((item) => item.label));
const barsKey = computed((): string => props.bars.map((bar) => bar.label + Object.values(bar.values).join()).join());
const maxValue = computed((): number => Math.max(...props.bars.flatMap((bar) => Object.values(bar.values)), 1));
const hoveredBar = computed((): B | null => (hoveredIndex.value === null ? null : (props.bars[hoveredIndex.value] ?? null)));

// methods
const barClass = (item: IChartSeries, bar: B, index: number): string => {
  if (bar.isCurrent && item.currentClass) return item.currentClass;
  return hoveredIndex.value === index && item.hoverClass ? item.hoverClass : item.colorClass;
};
</script>
