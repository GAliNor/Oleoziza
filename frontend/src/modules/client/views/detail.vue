<template>
  <app-layout>
    <section v-if="client" class="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header class="rise flex items-center gap-3">
        <ui-avatar class="h-14 w-14 text-lg" :name="client.name" fallback-class="bg-action text-fg-on-action" />
        <div class="min-w-0">
          <h1 class="heading-one truncate">{{ client.name }}</h1>
          <p class="body-two">{{ formatPhone(client.phone) }} · {{ $t(`client.kinds.${client.kind}`) }}</p>
        </div>
      </header>

      <div class="stagger grid gap-2" :class="isAmountShown ? 'grid-cols-3' : 'grid-cols-2'">
        <div class="card p-3">
          <p class="body-two">{{ $t('client.record.oilStock') }}</p>
          <p class="text-xl figure">{{ formatLitres(account.oilStockLitres) }}</p>
        </div>
        <div v-if="!isAmountShown" class="card p-3" :class="{ 'border-warning-subtle bg-warning-subtle': unpaidCount }">
          <p class="body-two">{{ $t('client.page.unpaidLots') }}</p>
          <p class="text-xl figure" :class="{ 'text-fg-warning': unpaidCount }">{{ unpaidCount }}</p>
          <p v-if="unpaidCount" class="body-two text-fg-warning">{{ $t('client.page.toCashDesk') }}</p>
        </div>
        <div v-if="isAmountShown" class="card p-3" :class="{ 'border-warning-subtle bg-warning-subtle': account.dueDh }">
          <p class="body-two">{{ $t('client.record.owes') }}</p>
          <p class="text-xl figure" :class="{ 'text-fg-warning': account.dueDh }">{{ formatMoney(account.dueDh) }}</p>
          <p v-if="account.pendingDh" class="body-two text-fg-warning">{{ $t('client.page.pending', { amount: formatMoney(account.pendingDh) }) }}</p>
        </div>
        <div v-if="isAmountShown" class="card p-3">
          <p class="body-two">{{ $t('client.page.millOwes') }}</p>
          <p class="text-xl figure">{{ formatMoney(account.payoutDh) }}</p>
        </div>
      </div>

      <div v-if="actions.length" class="grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          v-for="action in actions"
          :key="action.key"
          type="button"
          class="press-lift flex min-h-20 flex-col items-start justify-end rounded-card p-3 text-start font-semibold"
          :class="[action.tone, { 'ring-4 ring-highlight': route.query.action === action.key }]"
          @click="handleAction(action.key)"
        >
          {{ $t(`client.page.actions.${action.key}`) }}
          <span class="text-sm font-normal opacity-80">{{ action.hint(account) }}</span>
        </button>
      </div>

      <p v-if="client.creditDh && isAmountShown" class="card flex items-center justify-between gap-3 border-info-subtle bg-info-subtle p-3 text-fg-info" role="status">
        <span class="font-medium">{{ $t('client.page.credit') }}</span>
        <span class="figure">{{ formatMoney(client.creditDh) }}</span>
      </p>

      <payment-form
        v-if="isPaying && client"
        :client-id="client.id"
        :client-name="client.name"
        :site-id="siteStore.currentSiteId ?? ''"
        :oil-stock-litres="account.oilStockLitres"
        :credit-dh="client.creditDh"
        @close="isPaying = false"
        @saved="isPaying = false"
      />

      <client-history v-if="!isManagement && siteStore.currentSiteId" class="mt-2" :client="client" :site-id="siteStore.currentSiteId" />

      <template v-if="managementClient">
        <client-coordinates class="mt-6" :client="managementClient" />
        <management-client-detail class="mt-6" :client="managementClient" :is-finance-shown="siteStore.can('finance.view')" />
      </template>
    </section>
    <div v-else-if="clientStore.isLoading" class="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <div v-for="index in 3" :key="index" class="skeleton h-20 rounded-card" />
    </div>
    <ui-empty-state v-else size="page" :message="$t('client.page.notFound')" />
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useLotStore } from 'lot/stores/lot';
import { formatPhone } from 'global/composables/phone';
import { useClientStore } from 'client/stores/client';
import type { IClientAccount } from 'client/types/client';
import type { Permission } from 'global/types/session';
import { formatMoney } from 'global/composables/money';
import { clientMoney } from 'lot/composables/client-money';
import { formatLitres } from 'lot/composables/quantity';
import { paymentStateOf } from 'lot/composables/fee';
import { AMOUNT_PERMISSIONS } from 'finance/constants/finance';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import AppLayout from 'global/components/app-layout.vue';
import ClientCoordinates from 'client/components/client-coordinates.vue';
import ClientHistory from 'client/components/client-history.vue';
import ManagementClientDetail from 'client/components/management-client-detail.vue';
import PaymentForm from 'finance/components/payment-form.vue';

// stores
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const lotStore = useLotStore();
const clientStore = useClientStore();

// variables
const isPaying = ref(route.query.action === 'payment');
type ClientAction = 'withdrawal' | 'payment' | 'payout' | 'reception';
const ACTIONS: { key: ClientAction; permission: Permission; tone: string; hint: (account: IClientAccount) => string }[] = [
  { key: 'withdrawal', permission: 'withdrawal.create', tone: 'bg-accent-subtle text-fg-accent', hint: (account) => t(unpaidCount.value ? 'client.page.hints.withdrawalUnpaid' : 'client.page.hints.withdrawal', { quantity: formatLitres(account.oilStockLitres) }) },
  { key: 'payment', permission: 'payment.record', tone: 'bg-action text-fg-on-action', hint: (account) => (account.dueDh ? t('client.page.hints.payment', { amount: formatMoney(account.dueDh) }) : t('client.page.hints.paymentNone')) },
  { key: 'payout', permission: 'payout.record', tone: 'bg-subtle text-fg-display', hint: (account) => (account.payoutDh ? t('client.page.hints.payout', { amount: formatMoney(account.payoutDh) }) : t('client.page.hints.payoutNone')) },
  { key: 'reception', permission: 'reception.create', tone: 'bg-selected text-fg-brand', hint: () => t('client.page.hints.reception') },
];

// computed
const isManagement = computed((): boolean => sessionStore.isBackofficeView);
const isAmountShown = computed((): boolean => siteStore.can(AMOUNT_PERMISSIONS));
const unpaidCount = computed((): number => lotStore.lots.filter((lot) => lot.clientId === client.value?.id && ['unpaid', 'partial'].includes(paymentStateOf(lot))).length);
const actions = computed(() => ACTIONS.filter((action) => siteStore.can(action.permission)));
const managementClient = computed(() => (isManagement.value ? clientStore.recordById(String(route.params.id)) : undefined));
const client = computed(() => clientStore.clientById(String(route.params.id)));
const account = computed((): IClientAccount => ({ ...clientStore.accountOf(client.value?.id ?? ''), ...clientMoney(lotStore.lots, client.value?.id ?? '') }));

// watchers
watch(
  () => siteStore.currentSiteId,
  (siteId) => {
    if (siteId) lotStore.fetchLots(siteId);
  },
  { immediate: true },
);

watch(
  () => client.value?.id,
  (id) => {
    if (id) clientStore.fetchAccount(id);
  },
  { immediate: true },
);

// event handlers
const handleAction = (key: ClientAction): void => {
  if (key === 'reception') {
    router.push({ name: 'reception-new', query: { client: String(route.params.id) } });
    return;
  }
  if (key === 'payment') {
    isPaying.value = true;
    return;
  }
  const next = key === 'withdrawal' && unpaidCount.value ? t('client.page.pendingScreenNext') : '';
  toastStore.push(`${t('client.page.pendingScreen', { name: t(`client.page.actions.${key}`) })}${next}`, 'info');
};

// lifecycle
onMounted(() => {
  clientStore.fetchClients();
  if (isManagement.value) clientStore.fetchRecords();
});
</script>
