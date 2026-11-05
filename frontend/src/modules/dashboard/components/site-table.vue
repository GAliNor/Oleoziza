<template>
  <div class="card overflow-x-auto p-0">
    <table class="data-table min-w-160">
      <thead>
        <tr>
          <th class="px-4 py-3 font-semibold">{{ $t('dashboard.management.siteTable.site') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.siteTable.olives') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.siteTable.oil') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.siteTable.queue') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.siteTable.yield') }}</th>
          <th v-if="isFinanceShown" class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.siteTable.revenue') }}</th>
          <th v-if="isFinanceShown" class="px-4 py-3 text-end font-semibold">{{ $t('dashboard.management.siteTable.outstanding') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="site in sites"
          :key="site.siteId"
          class="cursor-pointer border-t border-subtle hover:bg-selected/30"
          @click="siteStore.selectSite(site.siteId)"
        >
          <td class="px-4 py-3 font-medium text-fg-display">{{ site.name }} {{ $t('global.arrow') }}</td>
          <td class="px-4 py-3 text-end tabular-nums">{{ formatKgRounded(site.oliveKgToday) }}</td>
          <td class="px-4 py-3 text-end tabular-nums">{{ formatLitresRounded(site.oilLitresToday) }}</td>
          <td class="px-4 py-3 text-end tabular-nums">{{ site.queue }}</td>
          <td class="px-4 py-3 text-end tabular-nums">{{ formatYieldValue(site.yieldPerQuintal) }}</td>
          <td v-if="isFinanceShown" class="px-4 py-3 text-end tabular-nums">{{ formatMoneyRounded(site.revenueSeason) }}</td>
          <td v-if="isFinanceShown" class="px-4 py-3 text-end tabular-nums">{{ formatMoneyRounded(site.outstanding) }}</td>
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
import { formatKgRounded, formatLitresRounded, formatYieldValue } from 'lot/composables/quantity';

// props
defineProps<{ sites: ISiteFigures[]; isFinanceShown: boolean }>();

// stores
const siteStore = useSiteStore();
</script>
