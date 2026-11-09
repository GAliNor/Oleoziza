<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">{{ $t('finance.cashDesk.title') }}</h1>
        <p class="body-two">{{ $t('finance.cashDesk.subtitle', { scope: scopeName }) }}</p>
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('finance.cashDesk.pickSite') }}</p>

      <template v-else>
        <div class="stagger grid grid-cols-2 gap-3">
          <div class="card flex flex-col gap-1 p-4">
            <p class="eyebrow">{{ $t('finance.cashDesk.cashToday') }}</p>
            <p class="text-display-xs figure text-fg-display">{{ formatMoney(cashToday) }}</p>
            <p class="body-two">{{ $t('finance.cashDesk.cashTodaySub') }}</p>
          </div>
          <router-link :to="{ name: 'finance' }" class="card press-lift flex flex-col gap-1 p-4 hover:border-brand" :class="{ 'border-warning-subtle bg-warning-subtle': pendingCount }">
            <p class="eyebrow">{{ $t('finance.cashDesk.toConfirm') }}</p>
            <p class="text-display-xs figure" :class="pendingCount ? 'text-fg-warning' : 'text-fg-display'">{{ pendingCount }}</p>
            <p class="body-two">{{ $t('finance.cashDesk.toConfirmSub') }}</p>
          </router-link>
        </div>

        <label class="relative">
          <search-line-icon class="pointer-events-none absolute top-1/2 inset-s-4 h-5 w-5 -translate-y-1/2 text-fg-muted" />
          <input ref="searchInput" v-model="query" class="input min-h-14 ps-12 text-lg" type="search" autocomplete="off" :placeholder="$t('finance.cashDesk.search')" />
        </label>

        <ul v-if="query" class="flex flex-col gap-2">
          <li v-for="client in searched" :key="client.id">
            <router-link
              :to="{ name: 'client-page', params: { id: client.id }, query: { action: 'payment' } }"
              class="press-lift flex min-h-16 items-center gap-3 rounded-card border border-default bg-surface px-3 py-2 hover:border-brand"
            >
              <client-row :client="client" />
              <span v-if="dueOf(client.id)" class="figure text-fg-warning">{{ formatMoney(dueOf(client.id)) }}</span>
            </router-link>
          </li>
          <li v-if="!searched.length"><ui-empty-state size="compact" :message="$t('finance.cashDesk.noResult', { query })" /></li>
        </ul>

        <section v-else class="flex flex-col gap-3">
          <h2 class="label">{{ $t('finance.cashDesk.toCollect', { count: toCollect.length }) }}</h2>
          <div v-if="lotStore.isLoading && !toCollect.length" class="flex flex-col gap-2">
            <div v-for="index in 4" :key="index" class="skeleton h-16 rounded-card" />
          </div>
          <ui-empty-state v-else-if="!toCollect.length" size="compact" :message="$t('finance.cashDesk.nothing')" />
          <ul v-else class="stagger flex flex-col gap-2">
            <li v-for="row in visible" :key="row.clientId || row.clientName">
              <component
                :is="row.clientId ? 'router-link' : 'div'"
                :to="row.clientId ? { name: 'client-page', params: { id: row.clientId }, query: { action: 'payment' } } : undefined"
                class="press-lift flex min-h-16 items-center gap-3 rounded-card border border-default bg-surface px-3 py-2 hover:border-brand"
              >
                <ui-avatar class="h-11 w-11 shrink-0" :name="row.clientName" fallback-class="bg-subtle text-fg-primary-paragraph" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium text-fg-display">{{ row.clientName }}</span>
                  <span class="body-two block truncate">{{ $t('finance.cashDesk.lots', { count: row.lotCount }) }} · {{ $t('finance.cashDesk.lastMove', { date: formatDateTime(row.lastActivityAt) }) }}</span>
                </span>
                <span class="flex shrink-0 flex-col items-end gap-1">
                  <span class="figure text-fg-display">{{ formatMoney(row.dueDh) }}</span>
                  <span v-if="row.hasPendingDiscount" class="chip bg-warning-subtle text-fg-warning">{{ $t('lot.discount.pendingChip') }}</span>
                </span>
              </component>
            </li>
          </ul>
          <button v-if="visible.length < toCollect.length" type="button" class="btn-secondary self-center" @click="limit += PAGE_SIZE">
            {{ $t('finance.cashDesk.more', { count: toCollect.length - visible.length }) }}
          </button>
        </section>
      </template>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref, watch } from 'vue';

import { useClientStore } from 'client/stores/client';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { useSiteScope } from 'site/composables/use-site-scope';
import { clientsToCollect, type IClientToCollect } from 'finance/composables/cash-desk';
import { formatDateTime, toIsoDate, todayIso } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import type { IClient } from 'client/types/client';

import AppLayout from 'global/components/app-layout.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import ClientRow from 'client/components/client-row.vue';

// stores
const clientStore = useClientStore();
const financeStore = useFinanceStore();
const lotStore = useLotStore();
const siteStore = useSiteStore();
const { scopeName } = useSiteScope();

// variables
const PAGE_SIZE = 12;
const query = ref('');
const limit = ref(PAGE_SIZE);
const searchInput = ref<HTMLInputElement | null>(null);

// computed
const toCollect = computed((): IClientToCollect[] => clientsToCollect(lotStore.lots));
const visible = computed((): IClientToCollect[] => toCollect.value.slice(0, limit.value));
const searched = computed((): IClient[] => clientStore.searchClients(query.value, 10));
const siteMovements = computed(() => financeStore.movements.filter((movement) => movement.siteId === siteStore.currentSiteId && movement.kind === 'payment'));
const cashToday = computed((): number =>
  siteMovements.value.filter((movement) => movement.method === 'cash' && movement.status === 'confirmed' && toIsoDate(movement.recordedAt) === todayIso()).reduce((sum, movement) => sum + movement.amount, 0),
);
const pendingCount = computed((): number => siteMovements.value.filter((movement) => movement.status === 'pending').length);

// methods
const dueOf = (clientId: string): number => toCollect.value.find((row) => row.clientId === clientId)?.dueDh ?? 0;

// watchers
watch(
  () => siteStore.currentSiteId,
  (siteId) => {
    if (!siteId || siteStore.isAllSites) return;
    lotStore.fetchLots(siteId);
    financeStore.fetchMovements(siteId);
  },
  { immediate: true },
);

// lifecycle
onMounted(() => {
  clientStore.fetchClients();
  searchInput.value?.focus();
});
</script>
