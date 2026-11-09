<template>
  <div class="card flex min-w-0 flex-col gap-4 p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="heading-four">{{ $t('dashboard.tanks.planning') }}</h2>
        <p class="body-two">{{ $t('dashboard.tanks.planningHint') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="icon-btn" :aria-label="$t('dashboard.tanks.previous')" @click="offset -= periodDays">←</button>
        <p class="min-w-32 text-center label tabular-nums">{{ dayLabel(startDay) }} – {{ dayLabel(endDay) }}</p>
        <button type="button" class="icon-btn" :aria-label="$t('dashboard.tanks.next')" @click="offset += periodDays">→</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 body-three text-fg-primary-paragraph">
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-sm bg-primary-olive-mid" /> {{ $t('dashboard.tanks.clientOil') }}</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-sm bg-accent-sand" /> {{ $t('dashboard.tanks.millStock') }}</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-4 rounded-sm border border-dashed border-strong bg-subtle" /> {{ $t('lot.status.withdrawn') }}</span>
    </div>

    <div class="overflow-x-auto">
      <div :key="`${startDay}-${periodDays}`" class="min-w-190" dir="ltr">
        <div class="grid border-b border-default pb-1" :style="gridStyle">
          <p class="eyebrow">{{ $t('dashboard.tanks.tank') }}</p>
          <p
            v-for="day in days"
            :key="day"
            class="text-center text-xs tabular-nums"
            :class="day === 0 ? 'font-semibold text-fg-brand' : 'text-fg-secondary-paragraph'"
          >
            {{ isLabelShown(day) ? dayLabel(day) : '' }}
          </p>
        </div>

        <div v-for="tank in tanks" :key="tank.id" class="grid border-b border-subtle py-2" :style="gridStyle">
          <div class="pe-2">
            <p class="label text-fg-display">{{ tank.name }}</p>
            <p class="truncate body-three font-medium" :class="tank.variety ? 'text-fg-brand' : 'text-fg-muted'" :title="tank.variety ?? undefined">{{ tank.variety ?? $t('dashboard.tanks.emptyTank') }}</p>
            <p class="body-three tabular-nums">{{ Math.round((tank.fillLitres / tank.capacityLitres) * 100) }} % · {{ formatLitresRounded(tank.capacityLitres) }}</p>
          </div>
          <div class="relative" :style="{ gridColumn: `2 / span ${periodDays}`, height: `${lanesOf(tank.id).shown.length * 30 + (lanesOf(tank.id).hidden ? 24 : 4)}px` }">
            <div class="absolute inset-y-0 bg-selected/30" :style="todayStyle" />
            <p v-if="lanesOf(tank.id).hidden" class="absolute inset-x-0 bottom-0 px-2 body-three">{{ $t('dashboard.tanks.moreLots', { count: lanesOf(tank.id).hidden }) }}</p>
            <template v-for="(lane, laneIndex) in lanesOf(tank.id).shown" :key="laneIndex">
              <div
                v-for="(entry, entryIndex) in lane"
                :key="entry.id"
                class="grow-x absolute flex h-6.5 items-center overflow-hidden rounded-md px-2 text-xs font-medium whitespace-nowrap"
                :class="barClass(entry)"
                :style="{ ...barStyle(entry, laneIndex), animationDelay: `${(laneIndex + entryIndex) * 70}ms` }"
                :title="`${entry.client} · ${entry.lotCode} · ${formatLitresRounded(entry.litres)} · ${dayLabel(entry.startDay)} ${$t('global.arrow')} ${endLabel(entry)}`"
              >
                {{ entry.client }} · {{ formatLitresRounded(entry.litres) }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { IPeriod } from 'global/types/period';
import { formatLitresRounded } from 'lot/composables/quantity';
import { dayLabel, isInWindow, useTankWindow } from 'dashboard/composables/use-tank-window';
import type { ITank, ITankStorage } from 'dashboard/types/dashboard';

// props
const props = defineProps<{ tanks: ITank[]; storage: ITankStorage[]; period: IPeriod }>();

// stores
const { t } = useI18n();

// variables
const MAX_LANES = 6;
const { offset, periodDays, startDay, endDay } = useTankWindow(() => props.period);

// computed
const days = computed((): number[] => Array.from({ length: periodDays.value }, (_, index) => startDay.value + index));
const gridStyle = computed(() => ({ gridTemplateColumns: `120px repeat(${periodDays.value}, minmax(0, 1fr))` }));
const todayStyle = computed(() => {
  const index = -startDay.value;
  if (index < 0 || index >= periodDays.value) return { display: 'none' };
  return { left: `${(index / periodDays.value) * 100}%`, width: `${100 / periodDays.value}%` };
});

// methods
/** Lanes packed so Storages that don't overlap share one; past the cap, the rest is counted, so a busy Tank stays readable. */
const lanesOf = (tankId: string): { shown: ITankStorage[][]; hidden: number } => {
  const lanes = packLanes(tankId);
  return { shown: lanes.slice(0, MAX_LANES), hidden: lanes.slice(MAX_LANES).reduce((sum, lane) => sum + lane.length, 0) };
};

const packLanes = (tankId: string): ITankStorage[][] => {
  const visible = props.storage.filter((entry) => entry.tankId === tankId && isInWindow(entry, startDay.value, endDay.value)).sort((first, second) => first.startDay - second.startDay);
  const lanes: ITankStorage[][] = [];
  visible.forEach((entry) => {
    const lane = lanes.find((items) => (items[items.length - 1].endDay ?? Infinity) < entry.startDay);
    if (lane) lane.push(entry);
    else lanes.push([entry]);
  });
  return lanes.length ? lanes : [[]];
};

const barStyle = (entry: ITankStorage, laneIndex: number) => {
  const from = Math.max(entry.startDay, startDay.value) - startDay.value;
  const to = Math.min(entry.endDay ?? endDay.value, endDay.value) - startDay.value + 1;
  return {
    left: `calc(${(from / periodDays.value) * 100}% + 1px)`,
    width: `calc(${((to - from) / periodDays.value) * 100}% - 2px)`,
    top: `${laneIndex * 30 + 2}px`,
  };
};

const isOverdue = (entry: ITankStorage): boolean => entry.endDay === null && entry.plannedEndDay !== null && entry.plannedEndDay < 0;

const endLabel = (entry: ITankStorage): string => {
  if (entry.endDay !== null) return dayLabel(entry.endDay);
  if (entry.plannedEndDay === null) return t('dashboard.tanks.ongoing');
  return t(isOverdue(entry) ? 'dashboard.tanks.plannedPassed' : 'dashboard.tanks.plannedUntil', { date: dayLabel(entry.plannedEndDay) });
};

const barClass = (entry: ITankStorage): string => {
  if (entry.endDay !== null) return 'border border-dashed border-strong bg-subtle text-fg-secondary-paragraph';
  if (isOverdue(entry)) return 'bg-warning-subtle text-fg-warning';
  return entry.kind === 'mill' ? 'bg-accent-sand text-neutral-900' : 'bg-primary-olive-mid text-neutral-900';
};

const isLabelShown = (day: number): boolean => {
  const step = periodDays.value > 30 ? 5 : periodDays.value > 14 ? 3 : 1;
  return day === 0 || (day - startDay.value) % step === 0;
};

</script>
