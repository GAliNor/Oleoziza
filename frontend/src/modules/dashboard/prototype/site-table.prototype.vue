<template>
  <div class="card overflow-x-auto rounded-2xl p-0">
    <table class="w-full min-w-160 text-sm">
      <thead class="bg-page text-left eyebrow">
        <tr>
          <th class="px-4 py-3 font-semibold">Site</th>
          <th class="px-4 py-3 text-right font-semibold">Olives auj.</th>
          <th class="px-4 py-3 text-right font-semibold">Huile auj.</th>
          <th class="px-4 py-3 text-right font-semibold">File</th>
          <th class="px-4 py-3 text-right font-semibold">Rendement</th>
          <th v-if="isFinanceShown" class="px-4 py-3 text-right font-semibold">CA saison</th>
          <th v-if="isFinanceShown" class="px-4 py-3 text-right font-semibold">À encaisser</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="site in SITE_FIGURES"
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
// PROTOTYPE — per-Site comparison table shown in "All Sites" mode; a row click switches Site (ticket 0019).
// imports
import { useSiteStore } from 'site/stores/site';
import { SITE_FIGURES } from 'dashboard/prototype/mock-home.prototype';
import { formatMoneyRounded } from 'global/composables/money';
import { formatKgRounded } from 'lot/composables/quantity';
import { formatNumber } from 'global/composables/number';

// props
defineProps<{ isFinanceShown: boolean }>();

// stores
const siteStore = useSiteStore();
</script>
