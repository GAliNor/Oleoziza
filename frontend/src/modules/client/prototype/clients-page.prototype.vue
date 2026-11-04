<template>
  <!-- PROTOTYPE: Management Clients page at /clients (ticket 0030): the detail slides in over the table; ?client= keeps the open Client. -->
  <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
    <header class="rise flex flex-col gap-1">
      <h1 class="heading-one">Clients</h1>
      <p class="body-two">{{ scopeName }} · {{ rows.length }} clients</p>
    </header>

    <div v-show="!isOpen" class="rise flex flex-col gap-3 md:flex-row md:items-center">
      <input v-model="search" class="input md:max-w-xs" type="search" placeholder="Nom, téléphone ou identifiant" />
      <segmented-control v-model="stateFilter" :options="stateOptions" aria-label="Suivi" />
    </div>

    <div class="flex min-w-0 gap-4 overflow-hidden">
      <div
        class="flex w-full shrink-0 flex-col gap-3 transition-[margin,width] duration-500 ease-(--ease-premium)"
        :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }"
      >
        <div class="card min-w-0 overflow-x-auto rounded-2xl p-0">
          <table class="w-full text-sm">
            <thead class="bg-page text-left eyebrow">
              <tr>
                <th class="px-4 py-3 font-semibold">Client</th>
                <th class="hidden px-4 py-3 font-semibold sm:table-cell">Identifiant</th>
                <th class="hidden px-4 py-3 font-semibold lg:table-cell">Région</th>
                <th class="hidden px-4 py-3 font-semibold md:table-cell">Type</th>
                <th class="px-4 py-3 font-semibold">Téléphone</th>
                <th class="hidden px-4 py-3 font-semibold xl:table-cell">Email</th>
              </tr>
            </thead>
            <tbody :key="`${page}-${stateFilter}-${search}`" class="stagger">
              <tr
                v-for="(client, index) in pageRows"
                :key="client.id"
                class="cursor-pointer border-t border-subtle transition-colors hover:bg-page"
                :class="{ 'bg-selected/40': client.id === lastClientId }"
                tabindex="0"
                @click="handleOpen(client.id)"
                @keydown.enter="handleOpen(client.id)"
              >
                <td class="px-4 py-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <avatar-tag class="h-10 w-10" :name="client.name" :kind="client.kind === 'company' ? 'company' : 'client'" :delay="index * 40" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-fg-display">{{ client.name }}</p>
                      <p class="body-two truncate sm:hidden">{{ client.identifier }}</p>
                    </div>
                  </div>
                </td>
                <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph tabular-nums sm:table-cell">
                  {{ client.identifier }}
                  <span class="block caption">{{ client.kind === 'company' ? 'ICE' : 'CIN' }}</span>
                </td>
                <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph lg:table-cell">{{ client.region }}</td>
                <td class="hidden px-4 py-3 md:table-cell">
                  <span class="chip" :class="client.kind === 'company' ? 'bg-accent-subtle text-fg-accent' : 'bg-selected text-fg-brand'">
                    {{ KIND_LABELS[client.kind] }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-fg-primary-paragraph tabular-nums">{{ formatPhone(client.phone) }}</td>
                <td class="hidden max-w-56 truncate px-4 py-3 text-fg-primary-paragraph xl:table-cell">{{ client.email ?? '—' }}</td>
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
              :class="number === page ? 'bg-action text-fg-on-action' : 'text-fg-primary-paragraph hover:bg-subtle'"
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
        class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)"
        :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'"
        :aria-hidden="!isOpen"
      >
        <button type="button" class="btn-secondary inline-flex items-center gap-2 self-start" @click="handleClose">
          <arrow-left-line-icon class="h-5 w-5" />
          Retour aux clients
        </button>
        <div :key="activeClient.id" class="stagger flex flex-col gap-4">
          <client-header :client="activeClient" />
          <div class="grid grid-cols-3 gap-2 lg:gap-3">
            <div class="card p-3">
              <p class="body-three">Huile en stock</p>
              <p class="text-xl figure">{{ formatKg(activeClient.oilStockKg) }}</p>
            </div>
            <div class="card p-3" :class="{ 'border-warning-subtle bg-warning-subtle': isFinanceShown && activeClient.balance }">
              <p class="body-three">Doit au moulin</p>
              <p class="text-xl figure" :class="{ 'text-fg-warning': isFinanceShown && activeClient.balance }">
                {{ isFinanceShown ? formatMoney(activeClient.balance) : '—' }}
              </p>
            </div>
            <div class="card p-3">
              <p class="body-three">Lots cette saison</p>
              <p class="text-xl figure">{{ activeClient.lots }}</p>
            </div>
          </div>
          <management-client-detail :client="activeClient" :is-finance-shown="isFinanceShown" />
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — Management Clients page (ticket 0030): alphabetical paginated table; a row slides the table out and the detail in.
// imports
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useSiteStore } from 'site/stores/site';
import { formatPhone } from 'global/composables/phone';
import { type IClientPrototype } from 'dashboard/prototype/mock-home.prototype';
import { MANAGEMENT_CLIENTS, type IManagementClientPrototype } from 'client/prototype/mock-management-clients.prototype';
import { formatMoney } from 'global/composables/money';
import { formatKg } from 'lot/composables/quantity';

import SegmentedControl from 'dashboard/prototype/segmented-control.prototype.vue';
import ClientHeader from 'client/prototype/client-header.prototype.vue';
import ManagementClientDetail from 'client/prototype/management-client-detail.prototype.vue';
import AvatarTag from 'global/components/avatar-tag.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// stores
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
const KIND_LABELS: Record<IClientPrototype['kind'], string> = { individual: 'Particulier', company: 'Entreprise' };
const search = ref('');
const stateFilter = ref<StateFilter>('all');
const page = ref(1);
const lastClientId = ref<string | null>(null);

// computed
const isFinanceShown = computed((): boolean => siteStore.can('finance.view'));
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
    .filter(
      (client) =>
        [client.name, client.identifier, client.email ?? ''].some((value) => value.toLowerCase().includes(query)) ||
        (digits.length > 2 && client.phone.includes(digits.replace(/^0/, ''))),
    )
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
