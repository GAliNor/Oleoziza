<template>
  <div class="card flex min-w-0 flex-col gap-4 rounded-2xl p-5">
    <div class="flex items-baseline justify-between gap-2">
      <h2 class="heading-two">{{ title }}</h2>
      <p class="body-two">{{ unit }}</p>
    </div>
    <div class="relative min-h-44 flex-1" @mouseleave="hoveredIndex = null">
      <div :key="bars.map((bar) => bar.label + bar.value).join()" class="absolute inset-0 flex items-end gap-2">
        <div
          v-for="(bar, index) in bars"
          :key="bar.label"
          class="flex h-full flex-1 cursor-default flex-col justify-end"
          tabindex="0"
          @mouseenter="hoveredIndex = index"
          @focus="hoveredIndex = index"
        >
          <div
            class="grow-y rounded-t-sm transition-colors duration-300"
            :class="index === bars.length - 1 ? 'bg-primary-olive-dark' : hoveredIndex === index ? 'bg-primary-olive-mid' : 'bg-primary-olive-light'"
            :style="{ height: `${(bar.value / maxValue) * 100}%`, animationDelay: `${index * 45}ms` }"
          />
        </div>
      </div>
      <Transition name="fade-step">
        <div
          v-if="hoveredIndex !== null"
          class="pointer-events-none absolute -top-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg transition-[left] duration-300 ease-(--ease-premium)"
          :style="{ left: `clamp(0px, calc(${(hoveredIndex + 0.5) * (100 / bars.length)}% - 60px), calc(100% - 130px))` }"
        >
          <p class="font-semibold">{{ bars[hoveredIndex].label }}</p>
          <p v-for="line in bars[hoveredIndex].lines" :key="line">{{ line }}</p>
        </div>
      </Transition>
    </div>
    <div class="flex gap-2 border-t border-neutral-200 pt-2">
      <p v-for="bar in bars" :key="bar.label" class="flex-1 text-center text-xs text-neutral-500">{{ bar.label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — single-series bars, last bar highlighted, bars grow from the baseline, hover tooltip (ticket 0019).
// imports
import { computed, ref } from 'vue';

// props
const props = defineProps<{ title: string; unit: string; bars: { label: string; value: number; lines: string[] }[] }>();

// variables
const hoveredIndex = ref<number | null>(null);

// computed
const maxValue = computed((): number => Math.max(...props.bars.map((bar) => bar.value), 1));
</script>
