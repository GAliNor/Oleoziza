<template>
  <div class="card flex flex-col gap-4 rounded-2xl p-5">
    <div class="flex items-baseline justify-between">
      <h2 class="heading-two">Cuves</h2>
      <p class="body-two">{{ formatKg(totalFill) }} / {{ formatKg(totalCapacity) }}</p>
    </div>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3" :class="{ 'lg:grid-cols-5': tanks.length > 3 }">
      <div v-for="tank in tanks" :key="tank.id" class="flex flex-col overflow-hidden rounded-xl border border-neutral-200">
        <div class="relative h-24 bg-neutral-100">
          <div
            class="absolute inset-x-0 bottom-0 transition-[height] duration-700"
            :class="fillRatio(tank) >= 0.9 ? 'bg-accent-sand' : 'bg-primary-olive-mid'"
            :style="{ height: `${fillRatio(tank) * 100}%` }"
          />
          <p class="absolute inset-0 flex items-center justify-center text-lg font-semibold text-neutral-900 tabular-nums">
            {{ Math.round(fillRatio(tank) * 100) }} %
          </p>
        </div>
        <div class="flex items-center justify-between gap-1 bg-white px-2 py-1.5">
          <p class="truncate text-xs font-semibold text-neutral-700">{{ tank.name }}</p>
          <span v-if="tank.isBio" class="chip bg-success-green/10 px-1.5 text-[10px] text-success-green">Bio</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Tank fill cards, liquid-level style from reference 05 (ticket 0019).
// imports
import { computed } from 'vue';

import { formatKg, type ITankPrototype } from 'dashboard/prototype/mock-home.prototype';

// props
const props = defineProps<{ tanks: ITankPrototype[] }>();

// computed
const totalFill = computed((): number => props.tanks.reduce((sum, tank) => sum + tank.fillKg, 0));
const totalCapacity = computed((): number => props.tanks.reduce((sum, tank) => sum + tank.capacityKg, 0));

// methods
const fillRatio = (tank: ITankPrototype): number => tank.fillKg / tank.capacityKg;
</script>
