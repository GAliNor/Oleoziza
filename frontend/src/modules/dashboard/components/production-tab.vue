<template>
  <div class="stagger flex flex-col gap-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <ui-stat-tile
        :label="$t('dashboard.management.production.olives', { period: period.label })"
        :value="dashboard.season.oliveKg"
        :unit="$t('global.units.kilogram')"
        :delta="formatDelta(dashboard.season.oliveDeltaPct)"
        :delta-label="$t('dashboard.management.vsPreviousSeason')"
        is-delta-good
      />
      <ui-stat-tile
        :label="$t('dashboard.management.production.oil', { period: period.label })"
        :value="dashboard.season.oilLitres"
        :unit="$t('global.units.litre')"
        :delta="formatDelta(dashboard.season.oilDeltaPct)"
        :delta-label="$t('dashboard.management.vsPreviousSeason')"
        is-delta-good
      />
      <ui-stat-tile
        :label="$t('dashboard.management.yield')"
        :value="dashboard.season.yieldPerQuintal"
        :decimals="1"
        :unit="$t('global.units.litrePerQuintal')"
        :delta="formatDelta(dashboard.season.yieldDeltaPct)"
        :delta-label="$t('dashboard.management.vsPreviousSeason')"
        :is-delta-good="dashboard.season.yieldDeltaPct >= 0"
      />
      <ui-stat-tile
        :label="$t('dashboard.management.production.wait')"
        :value="dashboard.season.averageWaitHours"
        :decimals="1"
        unit="h"
        :sub="$t('dashboard.management.production.lotsPressed', { count: dashboard.season.lotsPressed })"
        :delta="formatDelta(dashboard.season.waitDeltaPct)"
        :delta-label="$t('dashboard.management.vsPreviousSeason')"
        :is-delta-good="dashboard.season.waitDeltaPct <= 0"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <olive-chart :chart="dashboard.oliveChart" class="lg:col-span-3" />
      <div class="card flex min-w-0 flex-col gap-4 p-5 lg:col-span-2">
        <h2 class="heading-four">{{ $t('dashboard.management.production.origin') }}</h2>
        <div class="flex h-3 gap-0.5 overflow-hidden rounded-full">
          <div class="grow-x bg-primary-olive" :style="{ flex: dashboard.modeSplit.serviceKg }" />
          <div class="grow-x bg-accent-sand" :style="{ flex: dashboard.modeSplit.purchaseKg, animationDelay: '120ms' }" />
        </div>
        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex items-center justify-between gap-2">
            <dt class="flex items-center gap-2 text-fg-primary-paragraph"><span class="h-2.5 w-2.5 rounded-full bg-primary-olive" /> {{ $t('dashboard.management.production.service') }}</dt>
            <dd class="font-medium whitespace-nowrap tabular-nums">{{ formatKgRounded(dashboard.modeSplit.serviceKg) }} · {{ servicePct }} %</dd>
          </div>
          <div class="flex items-center justify-between gap-2">
            <dt class="flex items-center gap-2 text-fg-primary-paragraph"><span class="h-2.5 w-2.5 rounded-full bg-accent-sand" /> {{ $t('dashboard.management.production.purchase') }}</dt>
            <dd class="font-medium whitespace-nowrap tabular-nums">{{ formatKgRounded(dashboard.modeSplit.purchaseKg) }} · {{ 100 - servicePct }} %</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <div class="table-card lg:col-span-3">
        <table class="data-table min-w-130">
          <thead>
            <tr>
              <th class="px-4 py-3 font-semibold">{{ $t('dashboard.management.production.columns.variety') }}</th>
              <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.production.columns.lots') }}</th>
              <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.production.columns.olives') }}</th>
              <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.production.columns.oil') }}</th>
              <th class="px-4 py-3 font-semibold">{{ $t('dashboard.management.production.columns.yield') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in dashboard.varieties" :key="row.variety" class="border-t border-subtle">
              <td class="px-4 py-3 font-medium text-fg-display">{{ row.variety }}</td>
              <td class="px-4 py-3 text-end tabular-nums">{{ row.lots }}</td>
              <td class="px-4 py-3 text-end tabular-nums">{{ formatKgRounded(row.olivesKg) }}</td>
              <td class="px-4 py-3 text-end tabular-nums">{{ formatLitresRounded(row.oilLitres) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <ui-progress-bar class="h-1.5 w-20" :value="yieldPerQuintal(row.oilLitres, row.olivesKg)" :max="YIELD_EXPECTED_MAX" :label="$t('dashboard.management.production.columns.yield')" :delay="index * 60" />
                  <span class="tabular-nums">{{ formatYield(row.oilLitres, row.olivesKg) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <tank-cards :tanks="dashboard.tanks" class="lg:col-span-2" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { formatKgRounded, formatLitresRounded, formatYield, yieldPerQuintal } from 'lot/composables/quantity';
import { YIELD_EXPECTED_MAX } from 'lot/constants/lot';
import { formatDelta } from 'global/composables/number';
import type { IDashboard } from 'dashboard/types/dashboard';
import type { IPeriod } from 'global/types/period';

import OliveChart from 'dashboard/components/olive-chart.vue';
import TankCards from 'dashboard/components/tank-cards.vue';
import UiProgressBar from 'global/components/ui-progress-bar.vue';
import UiStatTile from 'global/components/ui-stat-tile.vue';

// props
const props = defineProps<{ period: IPeriod; dashboard: IDashboard }>();

// computed
const servicePct = computed((): number => {
  const { serviceKg, purchaseKg } = props.dashboard.modeSplit;
  return Math.round((serviceKg / (serviceKg + purchaseKg)) * 100);
});

</script>
