<template>
  <div class="flex min-w-0 flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 class="heading-four">{{ $t('dashboard.tanks.planning') }}</h2>
        <p class="body-two">{{ dayLabel(startDay) }} – {{ dayLabel(endDay) }}</p>
      </div>
      <div class="flex items-center">
        <button type="button" class="icon-btn" :aria-label="$t('dashboard.tanks.previous')" @click="offset -= periodDays">←</button>
        <button type="button" class="icon-btn" :aria-label="$t('dashboard.tanks.next')" @click="offset += periodDays">→</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-x-4 gap-y-1 body-three text-fg-primary-paragraph">
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-primary-olive-mid" /> {{ $t('dashboard.tanks.client') }}</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-accent-sand" /> {{ $t('dashboard.tanks.millStock') }}</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm border border-dashed border-strong bg-subtle" /> {{ $t('lot.status.withdrawn') }}</span>
    </div>

    <div :key="startDay" class="stagger flex flex-col gap-3">
      <div v-for="tank in tanks" :key="tank.id" class="card flex flex-col gap-3 rounded-2xl p-4">
        <div class="flex items-baseline justify-between gap-2">
          <div class="min-w-0">
            <p class="font-semibold text-fg-display">
              {{ tank.name }} <span v-if="tank.isBio" class="chip ml-1 bg-success-subtle text-fg-success">{{ $t('dashboard.tanks.bio') }}</span>
            </p>
            <p class="truncate label text-fg-brand">{{ tank.variety }}</p>
          </div>
          <p class="body-two whitespace-nowrap tabular-nums">{{ formatKgRounded(tank.fillKg) }} / {{ formatKgRounded(tank.capacityKg) }}</p>
        </div>
        <div class="flex h-2.5 overflow-hidden rounded-full bg-subtle">
          <div
            v-for="entry in entriesOf(tank.id).filter((item) => item.endDay === null)"
            :key="entry.lotCode"
            class="grow-x h-full border-r border-surface"
            :class="entry.kind === 'mill' ? 'bg-accent-sand' : 'bg-primary-olive-mid'"
            :style="{ width: `${(entry.kg / tank.capacityKg) * 100}%` }"
          />
        </div>
        <ul class="flex flex-col divide-y divide-subtle">
          <li v-for="entry in entriesOf(tank.id)" :key="entry.lotCode" class="flex flex-col gap-1.5 py-2" :class="{ 'opacity-60': entry.endDay !== null }">
            <div class="flex items-baseline justify-between gap-2">
              <p class="min-w-0 truncate label text-fg-display">{{ entry.client }}</p>
              <p class="text-sm whitespace-nowrap tabular-nums">{{ formatKgRounded(entry.kg) }}</p>
            </div>
            <div class="relative h-1.5 rounded-full bg-subtle">
              <div class="absolute inset-y-0 rounded-full" :class="barClass(entry)" :style="rangeStyle(entry)" />
            </div>
            <p class="body-three">{{ entry.lotCode }} · {{ rangeLabel(entry) }}</p>
          </li>
          <li v-if="!entriesOf(tank.id).length" class="body-two py-2">{{ $t('dashboard.tanks.empty') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { useI18n } from 'vue-i18n';

import type { IPeriod } from 'global/types/period';
import { formatKgRounded } from 'lot/composables/quantity';
import { dayLabel, isInWindow, useTankWindow } from 'dashboard/composables/use-tank-window';
import type { ITank, ITankStorage } from 'dashboard/types/dashboard';

// props
const props = defineProps<{ tanks: ITank[]; storage: ITankStorage[]; period: IPeriod }>();

// stores
const { t } = useI18n();

// variables
const { offset, periodDays, startDay, endDay } = useTankWindow(() => props.period);

// methods
const entriesOf = (tankId: string): ITankStorage[] =>
  props.storage.filter((entry) => entry.tankId === tankId && isInWindow(entry, startDay.value, endDay.value)).sort(
    (first, second) => first.startDay - second.startDay,
  );

const barClass = (entry: ITankStorage): string => {
  if (entry.endDay !== null) return 'border border-dashed border-strong bg-subtle';
  return entry.kind === 'mill' ? 'bg-accent-sand' : 'bg-primary-olive-mid';
};

const rangeLabel = (entry: ITankStorage): string =>
  `${dayLabel(entry.startDay)} → ${entry.endDay === null ? t('dashboard.tanks.ongoing') : t('dashboard.tanks.withdrawnOn', { date: dayLabel(entry.endDay) })}`;

const rangeStyle = (entry: ITankStorage) => {
  const from = Math.max(entry.startDay, startDay.value) - startDay.value;
  const to = Math.min(entry.endDay ?? endDay.value, endDay.value) - startDay.value + 1;
  return { left: `${(from / periodDays.value) * 100}%`, width: `${((to - from) / periodDays.value) * 100}%` };
};

</script>
