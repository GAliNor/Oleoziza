<template>
  <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
    <header class="rise flex flex-col gap-1">
      <h1 class="heading-one">{{ $t('client.register.title') }}</h1>
      <p class="body-two">{{ $t('client.register.subtitle', { scope: scopeName, count: rows.length }) }}</p>
    </header>

    <div v-show="!isOpen" class="rise flex flex-col gap-3 md:flex-row md:items-center">
      <input v-model="search" class="input md:max-w-xs" type="search" :placeholder="$t('client.register.search')" />
      <ui-segmented v-model="stateFilter" :options="stateOptions" :label="$t('client.register.followUpLabel')" />
    </div>

    <ui-master-detail :is-open="isOpen" :back-label="$t('client.register.back')" @close="handleClose">
      <template #list>
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th class="px-4 py-3 font-semibold">{{ $t('client.register.columns.client') }}</th>
                <th class="hidden px-4 py-3 font-semibold sm:table-cell">{{ $t('client.register.columns.identifier') }}</th>
                <th class="hidden px-4 py-3 font-semibold lg:table-cell">{{ $t('client.register.columns.region') }}</th>
                <th class="hidden px-4 py-3 font-semibold md:table-cell">{{ $t('client.register.columns.kind') }}</th>
                <th class="px-4 py-3 font-semibold">{{ $t('client.register.columns.phone') }}</th>
                <th class="hidden px-4 py-3 font-semibold xl:table-cell">{{ $t('client.register.columns.email') }}</th>
              </tr>
            </thead>
            <tbody :key="`${page}-${stateFilter}-${search}`" class="stagger">
              <tr
                v-for="(client, index) in pageRows"
                :key="client.id"
                class="data-row"
                :class="{ 'bg-selected/40': client.id === lastClientId }"
                tabindex="0"
                @click="handleOpen(client.id)"
                @keydown.enter="handleOpen(client.id)"
              >
                <td class="px-4 py-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <ui-avatar class="h-10 w-10" :name="client.name" :variant="clientAvatarVariant(client.kind)" :delay="index * 40" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-fg-display">{{ client.name }}</p>
                      <p class="body-two truncate sm:hidden">{{ client.identifier }}</p>
                    </div>
                  </div>
                </td>
                <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph tabular-nums sm:table-cell">
                  {{ client.identifier }}
                  <span class="block caption">{{ $t(`client.identifierKinds.${client.kind}`) }}</span>
                </td>
                <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph lg:table-cell">{{ client.region }}</td>
                <td class="hidden px-4 py-3 md:table-cell">
                  <span class="chip" :class="client.kind === 'company' ? 'bg-accent-subtle text-fg-accent' : 'bg-selected text-fg-brand'">
                    {{ $t(`client.kinds.${client.kind}`) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-fg-primary-paragraph tabular-nums">{{ formatPhone(client.phone) }}</td>
                <td class="hidden max-w-56 truncate px-4 py-3 text-fg-primary-paragraph xl:table-cell">{{ client.email ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
          <ui-empty-state v-if="clientStore.hasError && !clientStore.records.length" tone="danger" :message="$t('client.search.loadError')" />
          <ui-empty-state v-else-if="!filteredRows.length && !clientStore.isLoading" :message="$t('client.register.empty')" />
        </div>

        <ui-pagination v-model:page="page" :page-count="pageCount" :total="filteredRows.length" :page-size="PAGE_SIZE" />
      
      </template>
      <template v-if="activeClient" #detail>
        <div :key="activeClient.id" class="stagger flex flex-col gap-10">
          <client-header :client="activeClient" :is-finance-shown="isFinanceShown" />
          <client-coordinates :client="activeClient" />
          <management-client-detail :client="activeClient" :is-finance-shown="isFinanceShown" />
        </div>
      </template>
    </ui-master-detail>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { usePagedRows } from 'global/composables/use-paged-rows';
import { useSiteStore } from 'site/stores/site';
import { formatPhone } from 'global/composables/phone';
import { useClientStore } from 'client/stores/client';
import { useSiteScope } from 'site/composables/use-site-scope';
import type { ClientFollowUp, IClientRecord } from 'client/types/client';

import { clientAvatarVariant } from 'client/composables/avatar-variant';
import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import ClientCoordinates from 'client/components/client-coordinates.vue';
import ClientHeader from 'client/components/client-header.vue';
import ManagementClientDetail from 'client/components/management-client-detail.vue';
import UiAvatar from 'global/components/ui-avatar.vue';

// stores
const { t } = useI18n();
const siteStore = useSiteStore();
const clientStore = useClientStore();
const { scopeName } = useSiteScope();
const route = useRoute();
const router = useRouter();

// variables
type StateFilter = ClientFollowUp | 'all';
const PAGE_SIZE = 10;
const STATE_FILTERS: StateFilter[] = ['all', 'at-risk', 'active', 'inactive'];
const search = ref('');
const stateFilter = ref<StateFilter>('all');
const lastClientId = ref<string | null>(null);

// computed
const isFinanceShown = computed((): boolean => siteStore.can('finance.view'));
const rows = computed((): IClientRecord[] =>
  clientStore.records.filter((client) => siteStore.isAllSites || client.sites.some((site) => site.siteId === siteStore.currentSiteId)),
);
const stateOptions = computed(() =>
  STATE_FILTERS.map((key) => ({ key, label: t(`client.register.followUp.${key}`), count: rows.value.filter((client) => key === 'all' || client.followUp === key).length })),
);
const filteredRows = computed((): IClientRecord[] => {
  const query = search.value.trim().toLowerCase();
  const digits = query.replace(/\D/g, '');
  return rows.value
    .filter((client) => stateFilter.value === 'all' || client.followUp === stateFilter.value)
    .filter(
      (client) =>
        [client.name, client.identifier, client.email ?? ''].some((value) => value.toLowerCase().includes(query)) ||
        (digits.length > 2 && client.phone.includes(digits.replace(/^0/, ''))),
    )
    .sort((first, second) => first.name.localeCompare(second.name, 'fr'));
});
const { page, pageCount, pageRows } = usePagedRows(filteredRows, PAGE_SIZE);
const openClientId = computed((): string | null => (typeof route.query.client === 'string' ? route.query.client : null));
const isOpen = computed((): boolean => rows.value.some((client) => client.id === openClientId.value));
const activeClient = computed((): IClientRecord | undefined => rows.value.find((client) => client.id === (openClientId.value ?? lastClientId.value)));

// watchers
watch([search, stateFilter], () => {
  page.value = 1;
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

// lifecycle
onMounted(() => clientStore.fetchRecords());
</script>
