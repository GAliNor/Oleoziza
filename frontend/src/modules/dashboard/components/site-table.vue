<template>
  <div class="card overflow-x-auto p-0">
    <table class="data-table min-w-160">
      <thead>
        <tr>
          <th class="px-4 py-3 font-semibold">{{ $t('dashboard.management.siteTable.site') }}</th>
          <th class="px-4 py-3 text-right font-semibold">{{ $t('dashboard.management.siteTable.olives') }}</th>
          <th class="px-4 py-3 text-right font-semibold">{{ $t('dashboard.management.siteTable.oil') }}</th>
          <th class="px-4 py-3 text-right font-semibold">{{ $t('dashboard.management.siteTable.queue') }}</th>
          <th class="px-4 py-3 text-right font-semibold">{{ $t('dashboard.management.siteTable.yield') }}</th>
          <th v-if="isFinanceShown" class="px-4 py-3 text-right font-semibold">{{ $t('dashboard.management.siteTable.revenue') }}</th>
          <th v-if="isFinanceShown" class="px-4 py-3 text-right font-semibold">{{ $t('dashboard.management.siteTable.outstanding') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="site in sites"
          :key="site.siteId"
          class="cursor-pointer border-t border-subtle hover:bg-selected/30"
          @click="siteStore.selectSite(site.siteId)"
        >
          <td class="px-4 py-3 font-medium text-fg-display">{{ site.name }} →</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatKgRounded(site.oliveKgToday) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatKgRounded(site.oilKgToday) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ site.queue }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatNumber(site.yieldPct, 1, 1) }} %</td>
          <td v-if="isFinanceShown" class="px-4 py-3 text-right tabular-nums">{{ formatMoneyRounded(site.revenueSeason) }}</td>
          <td v-if="isFinanceShown" class="px-4 py-3 text-right tabular-nums">{{ formatMoneyRounded(site.outstanding) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
// imports
import { useSiteStore } from 'site/stores/site';
import type { ISiteFigures } from 'dashboard/types/dashboard';
import { formatMoneyRounded } from 'global/composables/money';
import { formatKgRounded } from 'lot/composables/quantity';
import { formatNumber } from 'global/composables/number';

// props
defineProps<{ sites: ISiteFigures[]; isFinanceShown: boolean }>();

// stores
const siteStore = useSiteStore();
</script>
