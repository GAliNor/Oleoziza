<template>
  <div class="flex min-w-0 flex-col gap-4">
    <div class="table-card">
      <p class="eyebrow px-4 pt-4">{{ $t('client.record.bySite') }}</p>
      <table class="w-full text-sm">
        <thead class="text-left body-three">
          <tr>
            <th class="px-4 py-2 font-medium">{{ $t('client.record.site') }}</th>
            <th class="px-4 py-2 text-right font-medium">{{ $t('client.record.olives') }}</th>
            <th class="px-4 py-2 text-right font-medium">{{ $t('client.record.oilStock') }}</th>
            <th v-if="isFinanceShown" class="px-4 py-2 text-right font-medium">{{ $t('client.record.balance') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="site in client.sites" :key="site.siteId" class="border-t border-subtle">
            <td class="px-4 py-2 font-medium whitespace-nowrap">{{ site.siteName }}</td>
            <td class="px-4 py-2 text-right whitespace-nowrap tabular-nums">{{ formatKg(site.oliveKg) }}</td>
            <td class="px-4 py-2 text-right whitespace-nowrap tabular-nums">{{ site.oilStockKg ? formatKg(site.oilStockKg) : '—' }}</td>
            <td v-if="isFinanceShown" class="px-4 py-2 text-right whitespace-nowrap tabular-nums" :class="{ 'text-fg-warning': site.balance }">{{ site.balance ? formatMoney(site.balance) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card flex flex-col gap-2 rounded-2xl p-4">
      <p class="eyebrow">{{ $t('client.record.history') }}</p>
      <ul class="flex flex-col divide-y divide-subtle text-sm">
        <li v-for="lot in client.history" :key="lot.code" class="flex items-center justify-between gap-3 py-2">
          <span class="min-w-0">
            <span class="font-medium">{{ lot.code }}</span>
            <span class="body-two block truncate">{{ lot.siteName }} · {{ formatKg(lot.kg) }}</span>
          </span>
          <span class="shrink-0 text-right">
            <span class="chip bg-subtle text-fg-primary-paragraph">{{ $t(`lot.status.${lot.status}`) }}</span>
            <span class="block body-three">{{ $t(daysAgoKey(lot.daysAgo), { count: lot.daysAgo }) }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { formatMoney } from 'global/composables/money';
import { formatKg } from 'lot/composables/quantity';
import type { IClientRecord } from 'client/types/client';

// props
defineProps<{ client: IClientRecord; isFinanceShown: boolean }>();

// methods
const daysAgoKey = (days: number): string => (days === 0 ? 'client.record.today' : days === 1 ? 'client.record.yesterday' : 'client.record.daysAgo');
</script>
