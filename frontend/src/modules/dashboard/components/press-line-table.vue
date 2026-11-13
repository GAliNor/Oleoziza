<template>
  <div class="table-card">
    <table class="data-table min-w-130">
      <caption class="px-4 pt-4 text-start heading-four">{{ $t('dashboard.management.production.byLine') }}</caption>
      <thead>
        <tr>
          <th class="px-4 py-3 text-start font-semibold">{{ $t('dashboard.management.production.columns.line') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.production.columns.lots') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.production.columns.olives') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.production.columns.oil') }}</th>
          <th class="px-4 py-3 text-start font-semibold">{{ $t('dashboard.management.production.columns.yield') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.production.columns.hours') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.pressLineId" class="border-t border-subtle">
          <td class="px-4 py-3 font-medium text-fg-display">{{ row.name }}</td>
          <td class="px-4 py-3 text-end whitespace-nowrap tabular-nums">{{ row.lots }}</td>
          <td class="px-4 py-3 text-end whitespace-nowrap tabular-nums">{{ formatKgRounded(row.olivesKg) }}</td>
          <td class="px-4 py-3 text-end whitespace-nowrap tabular-nums">{{ formatLitresRounded(row.oilLitres) }}</td>
          <td class="px-4 py-3">
            <div v-if="row.olivesKg" class="flex items-center gap-3">
              <ui-progress-bar class="h-1.5 w-16" :value="yieldPerQuintal(row.oilLitres, row.olivesKg)" :max="YIELD_EXPECTED_MAX" :label="$t('dashboard.management.production.columns.yield')" :delay="index * 60" />
              <span class="whitespace-nowrap tabular-nums">{{ formatYield(row.oilLitres, row.olivesKg) }}</span>
            </div>
            <span v-else class="text-fg-muted">—</span>
          </td>
          <td class="px-4 py-3 text-end whitespace-nowrap tabular-nums">{{ $t('dashboard.management.production.hours', { hours: formatNumber(row.pressingHours, 1) }) }}</td>
        </tr>
        <tr v-if="!rows.length" class="border-t border-subtle">
          <td colspan="6" class="px-4 py-6 text-center body-two">{{ $t('dashboard.management.lines.none') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
// imports
import { formatKgRounded, formatLitresRounded, formatYield, yieldPerQuintal } from 'lot/composables/quantity';
import { formatNumber } from 'global/composables/number';
import { YIELD_EXPECTED_MAX } from 'lot/constants/lot';
import type { IPressLineFigures } from 'dashboard/types/dashboard';

import UiProgressBar from 'global/components/ui-progress-bar.vue';

// props
defineProps<{ rows: IPressLineFigures[] }>();
</script>
