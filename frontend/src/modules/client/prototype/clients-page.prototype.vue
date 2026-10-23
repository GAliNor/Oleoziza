<template>
  <!-- PROTOTYPE: Management Clients page at /clients (ticket 0030): A's table, B's detail beside it; ?client= keeps the open Client. -->
  <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
    <header class="rise flex flex-col gap-1">
      <h1 class="heading-one">Clients</h1>
      <p class="body-two">{{ scopeName }} · {{ rows.length }} clients · chiffres de la saison</p>
    </header>

    <div class="rise flex flex-col gap-3 md:flex-row md:items-center">
      <input v-model="search" class="input md:max-w-xs" type="search" placeholder="Nom ou téléphone" />
      <segmented-control v-model="stateFilter" :options="stateOptions" aria-label="Suivi" />
    </div>

    <div class="flex min-w-0 gap-4 overflow-hidden">
      <div
        class="flex w-full shrink-0 flex-col gap-3 transition-[margin,width] duration-500 ease-(--ease-premium)"
        :class="{ '-ml-[calc(100%+1rem)] max-lg:h-0 lg:ml-0 lg:w-[42%]': isOpen }"
      >
        <div class="card min-w-0 overflow-x-auto rounded-2xl p-0">
          <table class="w-full text-sm">
            <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
              <tr>
                <th class="px-4 py-3 font-semibold">Client</th>
                <template v-if="!isOpen">
                  <th class="hidden px-4 py-3 text-right font-semibold md:table-cell">Olives</th>
                  <th class="hidden px-4 py-3 text-right font-semibold md:table-cell">Lots</th>
                  <th class="px-4 py-3 text-right font-semibold">Huile</th>
                </template>
                <th v-if="isFinanceShown" class="px-4 py-3 text-right font-semibold">Solde</th>
                <template v-if="!isOpen">
                  <th class="hidden px-4 py-3 font-semibold lg:table-cell">Dernière venue</th>
                  <th class="hidden px-4 py-3 font-semibold md:table-cell">Suivi</th>
                </template>
              </tr>
            </thead>
            <tbody :key="`${page}-${stateFilter}-${search}`" class="stagger">
              <tr
                v-for="client in pageRows"
                :key="client.id"
                class="cursor-pointer border-t border-neutral-100 transition-colors"
                :class="client.id === activeClient?.id && isOpen ? 'bg-primary-olive-light/40' : 'hover:bg-neutral-50'"
                tabindex="0"
                @click="handleOpen(client.id)"
                @keydown.enter="handleOpen(client.id)"
              >
                <td class="px-4 py-3">
                  <p class="flex items-center gap-2 font-medium text-neutral-900">
                    <span class="h-2 w-2 shrink-0 rounded-full" :class="STATE_DOTS[client.state]" :title="STATE_LABELS[client.state]" />
                    <span class="truncate">{{ client.name }}</span>
                  </p>
                  <p class="body-two truncate pl-4">{{ client.kind === 'company' ? 'Entreprise' : 'Particulier' }} · {{ client.sites.length }} site{{ client.sites.length > 1 ? 's' : '' }}</p>
                </td>
                <template v-if="!isOpen">
                  <td class="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums md:table-cell">{{ formatKg(client.seasonKg) }}</td>
                  <td class="hidden px-4 py-3 text-right tabular-nums md:table-cell">{{ client.lots }}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums">{{ client.oilStockKg ? formatKg(client.oilStockKg) : '—' }}</td>
                </template>
                <td v-if="isFinanceShown" class="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums" :class="client.balance ? 'text-accent-rust' : 'text-neutral-400'">
                  {{ client.balance ? formatDh(client.balance) : '—' }}
                </td>
                <template v-if="!isOpen">
                  <td class="hidden px-4 py-3 whitespace-nowrap text-neutral-600 lg:table-cell">{{ client.lastVisit }}</td>
                  <td class="hidden px-4 py-3 md:table-cell"><span class="chip" :class="STATE_CLASSES[client.state]">{{ STATE_LABELS[client.state] }}</span></td>
                </template>
              </tr>
            </tbody>
          </table>
          <p v-if="!filteredRows.length" class="body-two px-5 py-8 text-center">Aucun client</p>
        </div>

        <nav v-if="pageCount > 1" class="flex items-center justify-between gap-3" aria-label="Pages">
          <p class="body-two tabular-nums">{{ firstIndex + 1 }}–{{ firstIndex + pageRows.length }} sur {{ filteredRows.length }}</p>
          <div class="flex items-center gap-1">
            <button type="button" class="icon-btn" :disabled="page === 1" aria-label="Page précédente" @click="page--">←</button>
            <button
              v-for="number in pageCount"
              :key="number"
              type="button"
              class="h-9 min-w-9 rounded-lg px-2 text-sm tabular-nums transition-colors"
              :class="number === page ? 'bg-primary-olive-dark text-white' : 'text-neutral-600 hover:bg-neutral-100'"
              :aria-current="number === page ? 'page' : undefined"
              @click="page = number"
            >
              {{ number }}
            </button>
            <button type="button" class="icon-btn" :disabled="page === pageCount" aria-label="Page suivante" @click="page++">→</button>
          </div>
        </nav>
      </div>

      <aside
        v-if="activeClient"
        class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium) lg:w-auto lg:flex-1"
        :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'"
        :aria-hidden="!isOpen"
      >
        <button type="button" class="link self-start lg:hidden" @click="handleClose">← Clients</button>
        <div :key="activeClient.id" class="stagger flex flex-col gap-4">
          <client-header :client="activeClient" is-closable @close="handleClose" />
          <div class="grid grid-cols-3 gap-2">
            <div class="card p-3">
              <p class="body-two text-xs">Huile en stock</p>
              <p class="text-xl font-semibold tabular-nums">{{ formatKg(activeClient.oilStockKg) }}</p>
            </div>
            <div class="card p-3" :class="{ 'border-accent-rust/40 bg-accent-rust/5': isFinanceShown && activeClient.balance }">
              <p class="body-two text-xs">Doit au moulin</p>
              <p class="text-xl font-semibold tabular-nums" :class="{ 'text-accent-rust': isFinanceShown && activeClient.balance }">
                {{ isFinanceShown ? formatDh(activeClient.balance) : '—' }}
              </p>
            </div>
            <div class="card p-3">
              <p class="body-two text-xs">Lots cette saison</p>
              <p class="text-xl font-semibold tabular-nums">{{ activeClient.lots }}</p>
            </div>
          </div>
          <management-client-detail :client="activeClient" :is-finance-shown="isFinanceShown" />
          <router-link :to="{ name: 'client-page', params: { id: activeClient.id } }" class="btn-secondary text-center">Ouvrir la fiche comptoir</router-link>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — Management Clients page (ticket 0030): alphabetical paginated table; a row slides the table aside and opens the detail.
// imports
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { formatDh, formatKg, type IClientPrototype } from 'dashboard/prototype/mock-home.prototype';
import { MANAGEMENT_CLIENTS, type IManagementClientPrototype } from 'client/prototype/mock-management-clients.prototype';

import SegmentedControl from 'dashboard/prototype/segmented-control.prototype.vue';
import ClientHeader from 'client/prototype/client-header.prototype.vue';
import ManagementClientDetail from 'client/prototype/management-client-detail.prototype.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const route = useRoute();
const router = useRouter();

// variables
type ClientState = IClientPrototype['state'];
type StateFilter = ClientState | 'all';
const PAGE_SIZE = 10;
const STATE_FILTERS: { key: StateFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'at-risk', label: 'À relancer' },
  { key: 'active', label: 'Actifs' },
  { key: 'inactive', label: 'Inactifs' },
];
const STATE_LABELS: Record<ClientState, string> = { active: 'Actif', 'at-risk': 'À relancer', inactive: 'Inactif' };
const STATE_CLASSES: Record<ClientState, string> = {
  active: 'bg-success-green/10 text-success-green',
  'at-risk': 'bg-accent-gold/30 text-accent-brown',
  inactive: 'bg-neutral-100 text-neutral-600',
};
const STATE_DOTS: Record<ClientState, string> = { active: 'bg-success-green', 'at-risk': 'bg-accent-gold', inactive: 'bg-neutral-300' };
const search = ref('');
const stateFilter = ref<StateFilter>('all');
const page = ref(1);
const lastClientId = ref<string | null>(null);

// computed
const isFinanceShown = computed((): boolean => authStore.can('finance.view'));
const scopeName = computed((): string => (siteStore.isAllSites ? 'Tous les sites' : (siteStore.currentSite?.name ?? '')));
const rows = computed((): IManagementClientPrototype[] =>
  MANAGEMENT_CLIENTS.filter((client) => siteStore.isAllSites || client.sites.some((site) => site.siteId === siteStore.currentSiteId)),
);
const stateOptions = computed(() =>
  STATE_FILTERS.map((filter) => ({ ...filter, count: rows.value.filter((client) => filter.key === 'all' || client.state === filter.key).length })),
);
const filteredRows = computed((): IManagementClientPrototype[] => {
  const query = search.value.trim().toLowerCase();
  const digits = query.replace(/\D/g, '');
  return rows.value
    .filter((client) => stateFilter.value === 'all' || client.state === stateFilter.value)
    .filter((client) => client.name.toLowerCase().includes(query) || (digits.length > 2 && client.phone.includes(digits)))
    .sort((first, second) => first.name.localeCompare(second.name, 'fr'));
});
const pageCount = computed((): number => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)));
const firstIndex = computed((): number => (page.value - 1) * PAGE_SIZE);
const pageRows = computed((): IManagementClientPrototype[] => filteredRows.value.slice(firstIndex.value, firstIndex.value + PAGE_SIZE));
const openClientId = computed((): string | null => (typeof route.query.client === 'string' ? route.query.client : null));
const isOpen = computed((): boolean => rows.value.some((client) => client.id === openClientId.value));
const activeClient = computed((): IManagementClientPrototype | undefined => rows.value.find((client) => client.id === (openClientId.value ?? lastClientId.value)));

// watchers
watch([search, stateFilter], () => {
  page.value = 1;
});
watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
});
watch(
  openClientId,
  (id) => {
    if (id) lastClientId.value = id;
  },
  { immediate: true },
);

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, client: id } });
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, client: undefined } });
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isOpen.value) handleClose();
};

// lifecycle
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>
