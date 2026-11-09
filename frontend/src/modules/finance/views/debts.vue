<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-5">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">{{ $t('finance.debts.title') }}</h1>
        <p class="body-two">{{ $t('finance.debts.subtitle', { scope: scopeName, amount: formatMoney(totalDue), count: rows.length }) }}</p>
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('finance.debts.pickSite') }}</p>

      <template v-else>
        <div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button v-for="option in FILTERS" :key="option" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': filter === option }" @click="filter = option">
            {{ $t(`finance.debts.filters.${option}`, { count: rows.filter((row) => matchesDebtFilter(row, option)).length }) }}
          </button>
        </div>

        <div v-if="lotStore.isLoading && !rows.length" class="flex flex-col gap-2">
          <div v-for="index in 5" :key="index" class="skeleton h-18 rounded-card" />
        </div>
        <ui-empty-state v-else-if="!shown.length" size="compact" :message="$t(rows.length ? 'finance.debts.noMatch' : 'finance.debts.none')" />
        <ul v-else class="stagger flex flex-col gap-2">
          <li v-for="row in visible" :key="row.key" class="card p-0">
            <button type="button" class="flex w-full items-center gap-3 p-3 text-start" :aria-expanded="openKey === row.key" @click="handleToggle(row.key)">
              <ui-avatar class="h-11 w-11 shrink-0" :name="row.clientName" fallback-class="bg-subtle text-fg-primary-paragraph" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium text-fg-display">{{ row.clientName }}</span>
                <span class="body-two block truncate">{{ $t('finance.debts.age', { count: row.ageDays }) }} · {{ $t('finance.cashDesk.lots', { count: row.lots.length }) }}</span>
                <span class="mt-1 flex flex-wrap gap-1">
                  <span v-if="row.isPromiseOverdue" class="chip bg-danger-subtle text-fg-danger">{{ $t('finance.debts.promiseOverdue', { date: formatShortDate(row.promisedOn ?? '') }) }}</span>
                  <span v-else-if="row.promisedOn" class="chip bg-selected text-fg-brand">{{ $t('finance.debts.promised', { date: formatShortDate(row.promisedOn) }) }}</span>
                  <span v-if="!row.contacts.length" class="chip bg-subtle text-fg-primary-paragraph">{{ $t('finance.debts.noContact') }}</span>
                  <span v-else class="chip bg-subtle text-fg-primary-paragraph">{{ $t('finance.debts.lastContact', { date: formatShortDate(row.contacts[0].at) }) }}</span>
                </span>
              </span>
              <span class="shrink-0 figure text-fg-warning">{{ formatMoney(row.dueDh) }}</span>
            </button>
            <debt-detail v-if="openKey === row.key" class="border-t border-subtle p-3" :row="row" :site-id="siteStore.currentSiteId ?? ''" />
          </li>
        </ul>
        <button v-if="visible.length < shown.length" type="button" class="btn-secondary self-center" @click="limit += PAGE_SIZE">
          {{ $t('finance.cashDesk.more', { count: shown.length - visible.length }) }}
        </button>
      </template>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { useSiteScope } from 'site/composables/use-site-scope';
import { debtRows, matchesDebtFilter, type DebtFilter, type IDebtRow } from 'finance/composables/debt-follow-up';
import { formatShortDate, todayIso } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';

import AppLayout from 'global/components/app-layout.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import DebtDetail from 'finance/components/debt-detail.vue';

// stores
const financeStore = useFinanceStore();
const lotStore = useLotStore();
const siteStore = useSiteStore();
const { scopeName } = useSiteScope();

// variables
const PAGE_SIZE = 15;
const FILTERS: DebtFilter[] = ['all', 'overdue', 'untouched'];
const filter = ref<DebtFilter>('all');
const limit = ref(PAGE_SIZE);
const openKey = ref<string | null>(null);

// computed
const rows = computed((): IDebtRow[] => debtRows(lotStore.lots, financeStore.debtContacts, todayIso()));
const shown = computed((): IDebtRow[] => rows.value.filter((row) => matchesDebtFilter(row, filter.value)));
const visible = computed((): IDebtRow[] => shown.value.slice(0, limit.value));
const totalDue = computed((): number => rows.value.reduce((sum, row) => sum + row.dueDh, 0));

// watchers
watch(filter, () => {
  limit.value = PAGE_SIZE;
});

watch(
  () => siteStore.currentSiteId,
  (siteId) => {
    if (!siteId || siteStore.isAllSites) return;
    lotStore.fetchLots(siteId);
    financeStore.fetchDebtContacts(siteId);
  },
  { immediate: true },
);

// event handlers
const handleToggle = (key: string): void => {
  openKey.value = openKey.value === key ? null : key;
};
</script>
