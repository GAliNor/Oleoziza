<template>
  <div class="flex min-w-0 flex-col gap-4">
    <div class="card min-w-0 overflow-x-auto rounded-2xl p-0">
      <p class="eyebrow px-4 pt-4 text-neutral-500">Par site · saison</p>
      <table class="w-full text-sm">
        <thead class="text-left text-xs text-neutral-500">
          <tr>
            <th class="px-4 py-2 font-medium">Site</th>
            <th class="px-4 py-2 text-right font-medium">Olives</th>
            <th class="px-4 py-2 text-right font-medium">Huile en stock</th>
            <th v-if="isFinanceShown" class="px-4 py-2 text-right font-medium">Solde</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="site in client.sites" :key="site.siteId" class="border-t border-neutral-100">
            <td class="px-4 py-2 font-medium whitespace-nowrap">{{ site.siteName }}</td>
            <td class="px-4 py-2 text-right whitespace-nowrap tabular-nums">{{ formatKg(site.oliveKg) }}</td>
            <td class="px-4 py-2 text-right whitespace-nowrap tabular-nums">{{ site.oilStockKg ? formatKg(site.oilStockKg) : '—' }}</td>
            <td v-if="isFinanceShown" class="px-4 py-2 text-right whitespace-nowrap tabular-nums" :class="{ 'text-accent-rust': site.balance }">{{ site.balance ? formatDh(site.balance) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card flex flex-col gap-2 rounded-2xl p-4">
      <p class="eyebrow text-neutral-500">Historique des lots</p>
      <ul class="flex flex-col divide-y divide-neutral-100 text-sm">
        <li v-for="lot in client.history" :key="lot.code" class="flex items-center justify-between gap-3 py-2">
          <span class="min-w-0">
            <span class="font-medium">{{ lot.code }}</span>
            <span class="body-two block truncate">{{ lot.siteName }} · {{ formatKg(lot.kg) }}</span>
          </span>
          <span class="shrink-0 text-right">
            <span class="chip bg-neutral-100 text-neutral-700">{{ lot.step }}</span>
            <span class="block text-xs text-neutral-500">{{ lot.at }}</span>
          </span>
        </li>
      </ul>
    </div>

    <div v-can="'audit_trail.view'" class="card flex flex-col gap-2 rounded-2xl p-4">
      <p class="eyebrow text-neutral-500">Journal d’audit</p>
      <ol class="flex flex-col gap-2 border-l border-neutral-200 pl-3 text-sm">
        <li v-for="line in client.audit" :key="line.at + line.text">
          <p class="text-neutral-800">{{ line.text }}</p>
          <p class="text-xs text-neutral-500">{{ line.at }} · {{ line.by }}</p>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Management-only parts of a Client (all Sites, Lot history, Audit Trail) for the Clients page (ticket 0030).
// imports
import { formatDh, formatKg } from 'dashboard/prototype/mock-home.prototype';
import type { IManagementClientPrototype } from 'client/prototype/mock-management-clients.prototype';

// props
defineProps<{ client: IManagementClientPrototype; isFinanceShown: boolean }>();
</script>
