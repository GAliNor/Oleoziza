<template>
  <div class="card flex min-w-0 flex-col gap-4 rounded-2xl p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="heading-two">Planning des cuves</h2>
        <p class="body-two">Huile stockée par lot, du pressage au retrait</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="icon-btn" aria-label="Période précédente" @click="offset -= periodDays">←</button>
        <p class="min-w-32 text-center text-sm font-medium text-neutral-800 tabular-nums">{{ dayLabel(startDay) }} – {{ dayLabel(endDay) }}</p>
        <button type="button" class="icon-btn" aria-label="Période suivante" @click="offset += periodDays">→</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-sm bg-primary-olive-mid" /> Huile d’un client</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-sm bg-accent-sand" /> Stock du moulin</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-sm border border-dashed border-neutral-400 bg-neutral-100" /> Retiré</span>
    </div>

    <div class="overflow-x-auto">
      <div :key="`${startDay}-${periodDays}`" class="min-w-190">
        <div class="grid border-b border-neutral-200 pb-1" :style="gridStyle">
          <p class="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Cuve</p>
          <p
            v-for="day in days"
            :key="day"
            class="text-center text-[11px] tabular-nums"
            :class="day === 0 ? 'font-semibold text-primary-olive-dark' : 'text-neutral-500'"
          >
            {{ isLabelShown(day) ? dayLabel(day) : '' }}
          </p>
        </div>

        <div v-for="tank in tanks" :key="tank.id" class="grid border-b border-neutral-100 py-2" :style="gridStyle">
          <div class="pr-2">
            <p class="text-sm font-medium text-neutral-900">{{ tank.name }}</p>
            <p class="text-xs text-neutral-500 tabular-nums">{{ Math.round((tank.fillKg / tank.capacityKg) * 100) }} % · {{ formatKg(tank.capacityKg) }}</p>
          </div>
          <div class="relative" :style="{ gridColumn: `2 / span ${periodDays}`, height: `${lanesOf(tank.id).length * 30 + 4}px` }">
            <div class="absolute inset-y-0 bg-primary-olive-light/30" :style="todayStyle" />
            <template v-for="(lane, laneIndex) in lanesOf(tank.id)" :key="laneIndex">
              <div
                v-for="(entry, entryIndex) in lane"
                :key="entry.lotCode"
                class="grow-x absolute flex h-6.5 items-center overflow-hidden rounded-md px-2 text-xs font-medium whitespace-nowrap"
                :class="barClass(entry)"
                :style="{ ...barStyle(entry, laneIndex), animationDelay: `${(laneIndex + entryIndex) * 70}ms` }"
                :title="`${entry.client} · ${entry.lotCode} · ${formatKg(entry.kg)} · ${dayLabel(entry.startDay)} → ${entry.endDay === null ? 'en cours' : dayLabel(entry.endDay)}`"
              >
                {{ entry.client }} · {{ formatKg(entry.kg) }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Tank schedule as a Gantt: one row per Tank, one bar per Lot's oil from Pressing to Withdrawal (ticket 0019 follow-up).
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
const days = computed((): number[] => Array.from({ length: periodDays.value }, (_, index) => startDay.value + index));
const gridStyle = computed(() => ({ gridTemplateColumns: `120px repeat(${periodDays.value}, minmax(0, 1fr))` }));
const todayStyle = computed(() => {
  const index = -startDay.value;
  if (index < 0 || index >= periodDays.value) return { display: 'none' };
  return { left: `${(index / periodDays.value) * 100}%`, width: `${100 / periodDays.value}%` };
});

// methods
const lanesOf = (tankId: string): ITankStoragePrototype[][] => {
  const visible = TANK_STORAGE.filter(
    (entry) => entry.tankId === tankId && entry.startDay <= endDay.value && (entry.endDay ?? Infinity) >= startDay.value,
  ).sort((first, second) => first.startDay - second.startDay);
  const lanes: ITankStoragePrototype[][] = [];
  visible.forEach((entry) => {
    const lane = lanes.find((items) => (items[items.length - 1].endDay ?? Infinity) < entry.startDay);
    if (lane) lane.push(entry);
    else lanes.push([entry]);
  });
  return lanes.length ? lanes : [[]];
};

const barStyle = (entry: ITankStoragePrototype, laneIndex: number) => {
  const from = Math.max(entry.startDay, startDay.value) - startDay.value;
  const to = Math.min(entry.endDay ?? endDay.value, endDay.value) - startDay.value + 1;
  return {
    left: `calc(${(from / periodDays.value) * 100}% + 1px)`,
    width: `calc(${((to - from) / periodDays.value) * 100}% - 2px)`,
    top: `${laneIndex * 30 + 2}px`,
  };
};

const barClass = (entry: ITankStoragePrototype): string => {
  if (entry.endDay !== null) return 'border border-dashed border-neutral-400 bg-neutral-100 text-neutral-500';
  return entry.kind === 'mill' ? 'bg-accent-sand text-neutral-900' : 'bg-primary-olive-mid text-neutral-900';
};

const isLabelShown = (day: number): boolean => {
  const step = periodDays.value > 30 ? 5 : periodDays.value > 14 ? 3 : 1;
  return day === 0 || (day - startDay.value) % step === 0;
};

// watchers
watch(
  () => props.period.key,
  (key) => {
    offset.value = key === 'previous' ? -365 : 0;
  },
);
</script>
