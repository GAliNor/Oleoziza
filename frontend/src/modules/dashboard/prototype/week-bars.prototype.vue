<template>
  <div class="card flex flex-col gap-4 rounded-2xl p-5">
    <div class="flex items-baseline justify-between">
      <h2 class="heading-two">Olives reçues, 7 derniers jours</h2>
      <p class="body-two">kg</p>
    </div>
    <div class="relative flex h-44 items-end gap-2" @mouseleave="hoveredIndex = null">
      <div
        v-for="(day, index) in days"
        :key="day.day"
        class="group flex h-full flex-1 cursor-default flex-col justify-end"
        @mouseenter="hoveredIndex = index"
        @focus="hoveredIndex = index"
        tabindex="0"
      >
        <div
          class="rounded-t-[4px] transition-colors"
          :class="index === days.length - 1 ? 'bg-primary-olive-dark' : hoveredIndex === index ? 'bg-primary-olive-mid' : 'bg-primary-olive-light'"
          :style="{ height: `${(day.oliveKg * scale) / maxValue * 100}%` }"
        />
      </div>
      <div
        v-if="hoveredIndex !== null"
        class="pointer-events-none absolute -top-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg"
        :style="{ left: `calc(${(hoveredIndex + 0.5) * (100 / days.length)}% - 60px)` }"
      >
        <p class="font-semibold">{{ days[hoveredIndex].day }}</p>
        <p>{{ formatKg(days[hoveredIndex].oliveKg * scale) }} d’olives</p>
        <p>{{ formatKg(days[hoveredIndex].oilKg * scale) }} d’huile</p>
      </div>
    </div>
    <div class="flex gap-2 border-t border-neutral-200 pt-2">
      <p v-for="day in days" :key="day.day" class="flex-1 text-center text-xs text-neutral-500">{{ day.day }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — single-series 7-day bars with today highlighted and a hover tooltip (ticket 0019).
// imports
import { computed, ref } from 'vue';

import { formatKg, LAST_SEVEN_DAYS } from 'dashboard/prototype/mock-home.prototype';

// props
const props = withDefaults(defineProps<{ scale?: number }>(), { scale: 1 });

// variables
const days = LAST_SEVEN_DAYS;
const hoveredIndex = ref<number | null>(null);

// computed
const maxValue = computed((): number => Math.max(...days.map((day) => day.oliveKg)) * props.scale);
</script>
