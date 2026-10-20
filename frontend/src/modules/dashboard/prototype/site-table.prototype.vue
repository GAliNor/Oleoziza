<template>
  <div class="card overflow-x-auto rounded-2xl p-0">
    <table class="w-full min-w-[640px] text-sm">
      <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
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
          class="cursor-pointer border-t border-neutral-100 hover:bg-primary-olive-light/30"
          @click="siteStore.selectSite(site.siteId)"
        >
          <td class="px-4 py-3 font-medium text-neutral-900">{{ site.name }} →</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatKg(site.oliveKgToday) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatKg(site.oilKgToday) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ site.queue }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ site.yieldPct.toFixed(1) }} %</td>
          <td v-if="isFinanceShown" class="px-4 py-3 text-right tabular-nums">{{ formatDh(site.revenueSeason) }}</td>
          <td v-if="isFinanceShown" class="px-4 py-3 text-right tabular-nums">{{ formatDh(site.outstanding) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — per-Site comparison table shown in "All Sites" mode; a row click switches Site (ticket 0019).
// imports
import { useSiteStore } from 'global/stores/site';
import { formatDh, formatKg, SITE_FIGURES } from 'dashboard/prototype/mock-home.prototype';

// props
defineProps<{ isFinanceShown: boolean }>();

// stores
const siteStore = useSiteStore();
</script>
