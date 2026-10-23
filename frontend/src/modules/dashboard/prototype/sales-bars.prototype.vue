<template>
  <div class="card flex min-w-0 flex-col gap-4 rounded-2xl p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="heading-two">{{ title }}</h2>
      <div class="flex items-center gap-3 text-xs text-neutral-600">
        <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-primary-olive-light" /> CA</span>
        <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-primary-olive-dark" /> Encaissé</span>
      </div>
    </div>
    <div class="relative min-h-44 flex-1" @mouseleave="hoveredIndex = null">
      <div :key="bars.map((bar) => bar.label + bar.revenue).join()" class="absolute inset-0 flex items-end gap-3">
        <div
          v-for="(bar, index) in bars"
          :key="bar.label"
          class="flex h-full flex-1 cursor-default items-end justify-center gap-0.5"
          tabindex="0"
          @mouseenter="hoveredIndex = index"
          @focus="hoveredIndex = index"
        >
          <div
            class="grow-y w-1/2 max-w-6 rounded-t-sm"
            :class="hoveredIndex === index ? 'bg-primary-olive-mid' : 'bg-primary-olive-light'"
            :style="{ height: `${(bar.revenue / maxValue) * 100}%`, animationDelay: `${index * 45}ms` }"
          />
          <div
            class="grow-y w-1/2 max-w-6 rounded-t-sm bg-primary-olive-dark"
            :style="{ height: `${(bar.collected / maxValue) * 100}%`, animationDelay: `${index * 45 + 30}ms` }"
          />
        </div>
      </div>
      <Transition name="fade-step">
        <div
          v-if="hoveredIndex !== null"
          class="pointer-events-none absolute -top-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg transition-[left] duration-300 ease-(--ease-premium)"
          :style="{ left: `clamp(0px, calc(${(hoveredIndex + 0.5) * (100 / bars.length)}% - 70px), calc(100% - 150px))` }"
        >
          <p class="font-semibold">{{ bars[hoveredIndex].label }}</p>
          <p>CA {{ formatDh(bars[hoveredIndex].revenue) }}</p>
          <p>Encaissé {{ formatDh(bars[hoveredIndex].collected) }}</p>
        </div>
      </Transition>
    </div>
    <div class="flex gap-3 border-t border-neutral-200 pt-2">
      <p v-for="bar in bars" :key="bar.label" class="flex-1 text-center text-xs" :class="bar.isCurrent ? 'font-semibold text-primary-olive-dark' : 'text-neutral-500'">
        {{ bar.label }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — paired bars, CA next to Encaissé per day or week (tickets 0028 and 0029).
// imports
import { computed, ref } from 'vue';

import { formatDh, type ISalesBarPrototype } from 'dashboard/prototype/mock-home.prototype';

// props
const props = defineProps<{ title: string; bars: ISalesBarPrototype[] }>();

// variables
const hoveredIndex = ref<number | null>(null);

// computed
const maxValue = computed((): number => Math.max(...props.bars.map((bar) => bar.revenue), 1));
</script>
