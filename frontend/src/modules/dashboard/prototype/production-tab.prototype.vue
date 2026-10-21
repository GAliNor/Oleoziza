<template>
  <div class="stagger flex flex-col gap-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <kpi-tile :label="`Olives reçues · ${period.label}`" :value="SEASON.olivesKg * factor" unit="kg" :delta="formatDelta(SEASON.olivesKg, SEASON.previousOlivesKg)" is-delta-good />
      <kpi-tile :label="`Huile produite · ${period.label}`" :value="SEASON.oilKg * factor" unit="kg" :sub="formatLitres(SEASON.oilKg * factor)" :delta="formatDelta(SEASON.oilKg, SEASON.previousOilKg)" is-delta-good />
      <kpi-tile
        label="Rendement moyen"
        :value="SEASON.yieldPct"
        :decimals="1"
        unit="%"
        :sub="`${SEASON.yieldPct.toFixed(1)} kg d’huile par quintal`"
        :delta="formatDelta(SEASON.yieldPct, SEASON.previousYieldPct)"
        :is-delta-good="SEASON.yieldPct >= SEASON.previousYieldPct"
      />
      <kpi-tile
        label="Attente avant pressage"
        :value="PRODUCTION_EXTRA.averageWaitHours"
        :decimals="1"
        unit="h"
        :sub="`${Math.round(PRODUCTION_EXTRA.lotsPressedSeason * factor)} lots pressés`"
        :delta="formatDelta(PRODUCTION_EXTRA.averageWaitHours, PRODUCTION_EXTRA.previousAverageWaitHours)"
        :is-delta-good="PRODUCTION_EXTRA.averageWaitHours <= PRODUCTION_EXTRA.previousAverageWaitHours"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <week-bars :title="chart.title" unit="kg" :bars="chart.bars" class="lg:col-span-3" />
      <div class="card flex min-w-0 flex-col gap-4 rounded-2xl p-5 lg:col-span-2">
        <h2 class="heading-two">Origine des olives</h2>
        <div class="flex h-3 gap-0.5 overflow-hidden rounded-full">
          <div class="grow-x bg-primary-olive" :style="{ flex: MODE_SPLIT.serviceKg }" />
          <div class="grow-x bg-accent-sand" :style="{ flex: MODE_SPLIT.purchaseKg, animationDelay: '120ms' }" />
        </div>
        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex items-center justify-between gap-2">
            <dt class="flex items-center gap-2 text-neutral-700"><span class="h-2.5 w-2.5 rounded-full bg-primary-olive" /> Trituration à façon</dt>
            <dd class="font-medium whitespace-nowrap tabular-nums">{{ formatKg(MODE_SPLIT.serviceKg * factor) }} · {{ servicePct }} %</dd>
          </div>
          <div class="flex items-center justify-between gap-2">
            <dt class="flex items-center gap-2 text-neutral-700"><span class="h-2.5 w-2.5 rounded-full bg-accent-sand" /> Achats</dt>
            <dd class="font-medium whitespace-nowrap tabular-nums">{{ formatKg(MODE_SPLIT.purchaseKg * factor) }} · {{ 100 - servicePct }} %</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <div class="card min-w-0 overflow-x-auto rounded-2xl p-0 lg:col-span-3">
        <table class="w-full min-w-130 text-sm">
          <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
            <tr>
              <th class="px-4 py-3 font-semibold">Variété</th>
              <th class="px-4 py-3 text-right font-semibold">Lots</th>
              <th class="px-4 py-3 text-right font-semibold">Olives</th>
              <th class="px-4 py-3 text-right font-semibold">Huile</th>
              <th class="px-4 py-3 font-semibold">Rendement</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in VARIETY_FIGURES" :key="row.variety" class="border-t border-neutral-100">
              <td class="px-4 py-3 font-medium text-neutral-900">{{ row.variety }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ Math.max(1, Math.round(row.lots * factor)) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatKg(row.olivesKg * factor) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatKg(row.oilKg * factor) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100">
                    <div class="grow-x h-full rounded-full bg-primary-olive" :style="{ width: `${(yieldOf(row) / 24) * 100}%`, animationDelay: `${index * 60}ms` }" />
                  </div>
                  <span class="tabular-nums">{{ yieldOf(row).toFixed(1) }} %</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <tank-cards :tanks="tanks" class="lg:col-span-2" />
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Management Home "Production" tab, follows the global period (ticket 0019 follow-up).
// imports
import { computed } from 'vue';

import {
  formatDelta,
  formatKg,
  formatLitres,
  MODE_SPLIT,
  olivesBars,
  PRODUCTION_EXTRA,
  SEASON,
  VARIETY_FIGURES,
  type ITankPrototype,
} from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';

import KpiTile from 'dashboard/prototype/kpi-tile.prototype.vue';
import TankCards from 'dashboard/prototype/tank-cards.prototype.vue';
import WeekBars from 'dashboard/prototype/week-bars.prototype.vue';

// props
const props = defineProps<{ scale: number; period: IPeriodPrototype; tanks: ITankPrototype[] }>();

// computed
const factor = computed((): number => props.scale * props.period.factor);
const chart = computed(() => olivesBars(props.period.key, props.scale));
const servicePct = computed((): number => Math.round((MODE_SPLIT.serviceKg / (MODE_SPLIT.serviceKg + MODE_SPLIT.purchaseKg)) * 100));

// methods
const yieldOf = (row: { olivesKg: number; oilKg: number }): number => (row.oilKg / row.olivesKg) * 100;
</script>
