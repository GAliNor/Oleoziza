<template>
  <div class="card flex min-w-0 flex-col gap-3 rounded-2xl p-5">
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="heading-two">Clients traités</h2>
      <router-link :to="{ name: 'client-search' }" class="link whitespace-nowrap">Tous les clients →</router-link>
    </div>
    <p class="body-two -mt-2">{{ clients.length }} clients avec une réception, un pressage ou un retrait {{ period.noun }}</p>
    <ul class="flex flex-col divide-y divide-neutral-100">
      <li v-for="client in clients.slice(0, limit)" :key="client.name" class="flex items-center justify-between gap-3 py-2.5">
        <div class="min-w-0">
          <p class="truncate font-medium text-neutral-900">{{ client.name }}</p>
          <p class="body-two truncate">{{ client.lots }} lot{{ client.lots > 1 ? 's' : '' }} · {{ formatKg(client.oliveKg) }}</p>
        </div>
        <div class="shrink-0 text-right">
          <span class="chip" :class="STEP_CLASSES[client.lastStep]">{{ client.lastStep }}</span>
          <p class="mt-0.5 text-xs text-neutral-500">{{ client.lastAt }}</p>
        </div>
      </li>
    </ul>
    <p v-if="!clients.length" class="body-two py-4 text-center">Aucun client {{ period.noun }}</p>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — "Clients traités": Clients with any Lot activity in the period, linking to the Clients page (tickets 0028 and 0030).
// imports
import { computed } from 'vue';

import { useSiteStore } from 'global/stores/site';
import { formatKg, SERVED_CLIENTS, type IServedClientPrototype } from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';

// props
const props = withDefaults(defineProps<{ period: IPeriodPrototype; limit?: number }>(), { limit: 6 });

// stores
const siteStore = useSiteStore();

// variables
const STEP_CLASSES: Record<IServedClientPrototype['lastStep'], string> = {
  Réception: 'bg-neutral-100 text-neutral-700',
  Pressage: 'bg-primary-olive-light text-primary-olive-dark',
  Retrait: 'bg-accent-sand/30 text-accent-brown',
};

// computed
const clients = computed(() =>
  SERVED_CLIENTS.filter(
    (client) => (siteStore.isAllSites || client.siteId === siteStore.currentSiteId) && (props.period.key === 'previous' || client.days < props.period.days),
  ),
);
</script>
