<template>
  <div class="flex min-w-0 flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 class="heading-two">Planning des cuves</h2>
        <p class="body-two">{{ dayLabel(startDay) }} – {{ dayLabel(endDay) }}</p>
      </div>
      <div class="flex items-center">
        <button type="button" class="icon-btn" aria-label="Période précédente" @click="offset -= periodDays">←</button>
        <button type="button" class="icon-btn" aria-label="Période suivante" @click="offset += periodDays">→</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-primary-olive-mid" /> Client</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-accent-sand" /> Stock du moulin</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm border border-dashed border-neutral-400 bg-neutral-100" /> Retiré</span>
    </div>

    <div :key="startDay" class="stagger flex flex-col gap-3">
      <div v-for="tank in tanks" :key="tank.id" class="card flex flex-col gap-3 rounded-2xl p-4">
        <div class="flex items-baseline justify-between gap-2">
          <p class="font-semibold text-neutral-900">
            {{ tank.name }} <span v-if="tank.isBio" class="chip ml-1 bg-success-green/10 text-[10px] text-success-green">Bio</span>
          </p>
          <p class="text-sm text-neutral-500 tabular-nums">{{ formatKg(tank.fillKg) }} / {{ formatKg(tank.capacityKg) }}</p>
        </div>
        <div class="flex h-2.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            v-for="entry in entriesOf(tank.id).filter((item) => item.endDay === null)"
            :key="entry.lotCode"
            class="grow-x h-full border-r border-white"
            :class="entry.kind === 'mill' ? 'bg-accent-sand' : 'bg-primary-olive-mid'"
            :style="{ width: `${(entry.kg / tank.capacityKg) * 100}%` }"
          />
        </div>
        <ul class="flex flex-col divide-y divide-neutral-100">
          <li v-for="entry in entriesOf(tank.id)" :key="entry.lotCode" class="flex flex-col gap-1.5 py-2" :class="{ 'opacity-60': entry.endDay !== null }">
            <div class="flex items-baseline justify-between gap-2">
              <p class="min-w-0 truncate text-sm font-medium text-neutral-900">{{ entry.client }}</p>
              <p class="text-sm whitespace-nowrap tabular-nums">{{ formatKg(entry.kg) }}</p>
            </div>
            <div class="relative h-1.5 rounded-full bg-neutral-100">
              <div class="absolute inset-y-0 rounded-full" :class="barClass(entry)" :style="rangeStyle(entry)" />
            </div>
            <p class="text-xs text-neutral-500">{{ entry.lotCode }} · {{ rangeLabel(entry) }}</p>
          </li>
          <li v-if="!entriesOf(tank.id).length" class="body-two py-2">Vide sur la période</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Tank schedule on a phone, variant A of ticket 0031: one card per Tank listing its Lots with day ranges and kg.
// imports
import { computed, ref, watch } from 'vue';

import { dayLabel, formatKg, TANK_STORAGE, type ITankPrototype, type ITankStoragePrototype } from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';

// props
const props = defineProps<{ tanks: ITankPrototype[]; period: IPeriodPrototype }>();

// variables
const offset = ref(0);

// computed
const periodDays = computed((): number => Math.max(props.period.days, 7));
const startDay = computed((): number => offset.value - periodDays.value + 4);
const endDay = computed((): number => startDay.value + periodDays.value - 1);

// methods
const entriesOf = (tankId: string): ITankStoragePrototype[] =>
  TANK_STORAGE.filter((entry) => entry.tankId === tankId && entry.startDay <= endDay.value && (entry.endDay ?? Infinity) >= startDay.value).sort(
    (first, second) => first.startDay - second.startDay,
  );

const barClass = (entry: ITankStoragePrototype): string => {
  if (entry.endDay !== null) return 'border border-dashed border-neutral-400 bg-neutral-100';
  return entry.kind === 'mill' ? 'bg-accent-sand' : 'bg-primary-olive-mid';
};

const rangeLabel = (entry: ITankStoragePrototype): string =>
  `${dayLabel(entry.startDay)} → ${entry.endDay === null ? 'en cours' : `retiré le ${dayLabel(entry.endDay)}`}`;

const rangeStyle = (entry: ITankStoragePrototype) => {
  const from = Math.max(entry.startDay, startDay.value) - startDay.value;
  const to = Math.min(entry.endDay ?? endDay.value, endDay.value) - startDay.value + 1;
  return { left: `${(from / periodDays.value) * 100}%`, width: `${((to - from) / periodDays.value) * 100}%` };
};

// watchers
watch(
  () => props.period.key,
  (key) => {
    offset.value = key === 'previous' ? -365 : 0;
  },
);
</script>
