<template>
  <div class="flex flex-col gap-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <kpi-tile label="Olives reçues (saison)" :value="kgNumber(SEASON.olivesKg * scale)" unit="kg" :delta="formatDelta(SEASON.olivesKg, SEASON.previousOlivesKg)" is-delta-good />
      <kpi-tile label="Huile produite (saison)" :value="kgNumber(SEASON.oilKg * scale)" unit="kg" :sub="formatLitres(SEASON.oilKg * scale)" :delta="formatDelta(SEASON.oilKg, SEASON.previousOilKg)" is-delta-good />
      <kpi-tile label="Rendement moyen" :value="SEASON.yieldPct.toFixed(1)" unit="%" :sub="`${(SEASON.yieldPct).toFixed(1)} kg d’huile par quintal`" :delta="formatDelta(SEASON.yieldPct, SEASON.previousYieldPct)" :is-delta-good="SEASON.yieldPct >= SEASON.previousYieldPct" />
      <kpi-tile
        label="Attente avant pressage"
        :value="PRODUCTION_EXTRA.averageWaitHours.toFixed(1)"
        unit="h"
        :sub="`${Math.round(PRODUCTION_EXTRA.lotsPressedSeason * scale)} lots pressés`"
        :delta="formatDelta(PRODUCTION_EXTRA.averageWaitHours, PRODUCTION_EXTRA.previousAverageWaitHours)"
        :is-delta-good="PRODUCTION_EXTRA.averageWaitHours <= PRODUCTION_EXTRA.previousAverageWaitHours"
      />
    </div>

    <div class="grid gap-3 lg:grid-cols-5">
      <week-bars :scale="scale" class="lg:col-span-3" />
      <div class="card flex flex-col gap-4 rounded-2xl p-5 lg:col-span-2">
        <h2 class="heading-two">Origine des olives</h2>
        <div class="flex h-3 gap-0.5 overflow-hidden rounded-full">
          <div class="bg-primary-olive" :style="{ flex: MODE_SPLIT.serviceKg }" />
          <div class="bg-accent-sand" :style="{ flex: MODE_SPLIT.purchaseKg }" />
        </div>
        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex items-center justify-between">
            <dt class="flex items-center gap-2 text-neutral-700"><span class="h-2.5 w-2.5 rounded-full bg-primary-olive" /> Trituration à façon</dt>
            <dd class="font-medium tabular-nums">{{ formatKg(MODE_SPLIT.serviceKg * scale) }} · {{ servicePct }} %</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="flex items-center gap-2 text-neutral-700"><span class="h-2.5 w-2.5 rounded-full bg-accent-sand" /> Achats</dt>
            <dd class="font-medium tabular-nums">{{ formatKg(MODE_SPLIT.purchaseKg * scale) }} · {{ 100 - servicePct }} %</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="card overflow-x-auto rounded-2xl p-0">
      <table class="w-full min-w-[560px] text-sm">
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
          <tr v-for="row in VARIETY_FIGURES" :key="row.variety" class="border-t border-neutral-100">
            <td class="px-4 py-3 font-medium text-neutral-900">{{ row.variety }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ Math.round(row.lots * scale) }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ formatKg(row.olivesKg * scale) }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ formatKg(row.oilKg * scale) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
                  <div class="h-full rounded-full bg-primary-olive" :style="{ width: `${(yieldOf(row) / 24) * 100}%` }" />
                </div>
                <span class="tabular-nums">{{ yieldOf(row).toFixed(1) }} %</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Management Home "Production" tab (ticket 0019 follow-up).
// imports
import { computed } from 'vue';

import {
  formatDelta,
  formatKg,
  formatLitres,
  MODE_SPLIT,
  PRODUCTION_EXTRA,
  SEASON,
  VARIETY_FIGURES,
} from 'dashboard/prototype/mock-home.prototype';

import KpiTile from 'dashboard/prototype/kpi-tile.prototype.vue';
import WeekBars from 'dashboard/prototype/week-bars.prototype.vue';

// props
defineProps<{ scale: number }>();

// computed
const servicePct = computed((): number => Math.round((MODE_SPLIT.serviceKg / (MODE_SPLIT.serviceKg + MODE_SPLIT.purchaseKg)) * 100));

// methods
const kgNumber = (value: number): string => Math.round(value).toLocaleString('fr-FR');
const yieldOf = (row: { olivesKg: number; oilKg: number }): number => (row.oilKg / row.olivesKg) * 100;
</script>
