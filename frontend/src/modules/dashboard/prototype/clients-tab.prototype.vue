<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-center">
      <input v-model="search" class="input md:max-w-xs" type="search" placeholder="Rechercher un client" />
      <div class="flex gap-2 overflow-x-auto">
        <button
          v-for="filter in STATE_FILTERS"
          :key="filter.key"
          type="button"
          class="chip min-h-10 shrink-0 border px-3.5 text-sm"
          :class="stateFilter === filter.key ? 'border-primary-olive bg-primary-olive-light text-primary-olive-dark' : 'border-neutral-200 bg-white text-neutral-700'"
          @click="stateFilter = filter.key"
        >
          {{ filter.label }} <span class="font-semibold tabular-nums">{{ countOf(filter.key) }}</span>
        </button>
      </div>
    </div>

    <div class="card overflow-x-auto rounded-2xl p-0">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
          <tr>
            <th class="px-4 py-3 font-semibold">Client</th>
            <th class="px-4 py-3 text-right font-semibold">Olives (saison)</th>
            <th class="px-4 py-3 text-right font-semibold">Lots</th>
            <th class="px-4 py-3 text-right font-semibold">Huile en stock</th>
            <th v-if="isFinanceShown" class="px-4 py-3 text-right font-semibold">Solde</th>
            <th class="px-4 py-3 font-semibold">Dernière venue</th>
            <th class="px-4 py-3 font-semibold">Suivi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filteredClients" :key="client.name" class="border-t border-neutral-100 hover:bg-neutral-50">
            <td class="px-4 py-3">
              <p class="font-medium text-neutral-900">{{ client.name }}</p>
              <p class="body-two">{{ client.kind === 'company' ? 'Société' : 'Particulier' }}</p>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">{{ formatKg(client.seasonKg) }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ client.lots }}</td>
            <td class="px-4 py-3 text-right tabular-nums">{{ client.oilStockKg ? formatKg(client.oilStockKg) : '—' }}</td>
            <td v-if="isFinanceShown" class="px-4 py-3 text-right font-medium tabular-nums" :class="client.balance ? 'text-accent-rust' : 'text-neutral-400'">
              {{ client.balance ? formatDh(client.balance) : '—' }}
            </td>
            <td class="px-4 py-3 text-neutral-600">{{ client.lastVisit }}</td>
            <td class="px-4 py-3"><span class="chip" :class="STATE_CLASSES[client.state]">{{ STATE_LABELS[client.state] }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!filteredClients.length" class="body-two px-5 py-8 text-center">Aucun client</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Management Home "Clients" tab (ticket 0019 follow-up).
// imports
import { computed, ref } from 'vue';

import { useSiteStore } from 'global/stores/site';
import { CLIENTS, formatDh, formatKg, type IClientPrototype } from 'dashboard/prototype/mock-home.prototype';

// props
defineProps<{ isFinanceShown: boolean }>();

// stores
const siteStore = useSiteStore();

// variables
type StateFilter = IClientPrototype['state'] | 'all';
const STATE_FILTERS: { key: StateFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'at-risk', label: 'À relancer' },
  { key: 'active', label: 'Actifs' },
  { key: 'inactive', label: 'Inactifs' },
];
const STATE_LABELS: Record<IClientPrototype['state'], string> = { active: 'Actif', 'at-risk': 'À relancer', inactive: 'Inactif' };
const STATE_CLASSES: Record<IClientPrototype['state'], string> = {
  active: 'bg-success-green/10 text-success-green',
  'at-risk': 'bg-accent-gold/30 text-accent-brown',
  inactive: 'bg-neutral-100 text-neutral-600',
};
const search = ref('');
const stateFilter = ref<StateFilter>('all');

// computed
const siteClients = computed((): IClientPrototype[] =>
  CLIENTS.filter((client) => siteStore.isAllSites || client.siteId === siteStore.currentSiteId),
);
const filteredClients = computed((): IClientPrototype[] =>
  siteClients.value
    .filter((client) => stateFilter.value === 'all' || client.state === stateFilter.value)
    .filter((client) => client.name.toLowerCase().includes(search.value.trim().toLowerCase()))
    .sort((first, second) => second.seasonKg - first.seasonKg),
);

// methods
const countOf = (key: StateFilter): number => siteClients.value.filter((client) => key === 'all' || client.state === key).length;
</script>
