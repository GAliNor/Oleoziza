<template>
  <!-- PROTOTYPE (ticket 0026): the Operator's Client page, hub for Withdrawal and money actions. -->
  <app-layout>
    <section v-if="client" class="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header class="rise flex items-center gap-3">
        <span class="avatar h-14 w-14 bg-action text-lg text-fg-on-action">{{ client.name.slice(0, 2).toUpperCase() }}</span>
        <div class="min-w-0">
          <h1 class="heading-one truncate">{{ client.name }}</h1>
          <p class="body-two">{{ formatPhone(client.phone) }} · {{ client.kind === 'company' ? 'Entreprise' : 'Particulier' }}</p>
        </div>
      </header>

      <div class="stagger grid grid-cols-3 gap-2">
        <div class="card p-3">
          <p class="body-two">Huile en stock</p>
          <p class="text-xl figure">{{ account.oilStockKg }} kg</p>
          <p class="body-two">{{ formatLitres(account.oilStockKg) }}</p>
        </div>
        <div class="card p-3" :class="{ 'border-warning-subtle bg-warning-subtle': account.dueDh }">
          <p class="body-two">Doit au moulin</p>
          <p class="text-xl figure" :class="{ 'text-fg-warning': account.dueDh }">{{ formatMoney(account.dueDh) }}</p>
          <p v-if="account.pendingDh" class="body-two text-fg-warning">{{ account.pendingDh }} DH en attente</p>
        </div>
        <div class="card p-3">
          <p class="body-two">Le moulin lui doit</p>
          <p class="text-xl figure">{{ formatMoney(account.payoutDh) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          v-for="action in ACTIONS"
          :key="action.key"
          type="button"
          class="flex min-h-20 flex-col items-start justify-end rounded-2xl p-3 text-left font-semibold transition-[transform,box-shadow] active:scale-95"
          :class="[action.tone, { 'ring-4 ring-highlight': route.query.action === action.key }]"
          @click="handleAction(action.key)"
        >
          {{ action.label }}
          <span class="text-sm font-normal opacity-80">{{ action.hint(account) }}</span>
        </button>
      </div>

      <h2 class="heading-four mt-2">Lots sur ce site</h2>
      <ul class="flex flex-col gap-2">
        <li v-for="lot in lots" :key="lot.code" class="card flex items-center justify-between gap-3 p-3">
          <span>
            <span class="font-medium">{{ lot.code }}</span>
            <span class="body-two block">{{ formatKg(lot.kg) }}</span>
          </span>
          <span class="chip bg-subtle text-fg-primary-paragraph">{{ lot.status }}</span>
        </li>
        <li v-if="!lots.length" class="body-two py-6 text-center">Aucun lot cette saison</li>
      </ul>

      <template v-if="managementClient">
        <h2 class="heading-four mt-2">Direction</h2>
        <management-client-detail :client="managementClient" :is-finance-shown="siteStore.can('finance.view')" />
      </template>
    </section>
    <p v-else class="body-two py-16 text-center">Client introuvable</p>
  </app-layout>
</template>

<script setup lang="ts">
// PROTOTYPE — Client page (ticket 0026). Mock balances; Withdrawal and money screens are decided but not built yet.
// imports
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useReceptionStore } from 'reception/stores/reception';
import { useLotStore } from 'lot/stores/lot';
import { formatPhone } from 'global/composables/phone';
import { useClientStore } from 'client/stores/client';
import { CLIENT_ACCOUNTS_PROTOTYPE, EMPTY_ACCOUNT, type IAccountPrototype } from 'client/prototype/mock-accounts.prototype';
import { findManagementClient } from 'client/prototype/mock-management-clients.prototype';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatLitres } from 'lot/composables/quantity';

import AppLayout from 'global/components/app-layout.vue';
import ManagementClientDetail from 'client/prototype/management-client-detail.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const receptionStore = useReceptionStore();
const lotStore = useLotStore();
const clientStore = useClientStore();

// variables
const ACTIONS: { key: string; label: string; tone: string; hint: (account: IAccountPrototype) => string }[] = [
  { key: 'withdrawal', label: 'Retrait', tone: 'bg-accent-subtle text-fg-accent', hint: (account) => `${account.oilStockKg} kg disponibles` },
  { key: 'payment', label: 'Encaisser', tone: 'bg-action text-fg-on-action', hint: (account) => (account.dueDh ? `${account.dueDh} DH dus` : 'Rien à régler') },
  { key: 'payout', label: 'Payer', tone: 'bg-subtle text-fg-display', hint: (account) => (account.payoutDh ? `${account.payoutDh} DH à payer` : 'Aucun achat') },
  { key: 'reception', label: 'Réception', tone: 'bg-selected text-fg-brand', hint: () => 'Ouvrir un lot' },
];

// computed
const managementClient = computed(() => (sessionStore.session?.role === 'management' ? findManagementClient(String(route.params.id)) : undefined));
const client = computed(() => clientStore.clientById(String(route.params.id)));
const account = computed((): IAccountPrototype => (client.value ? (CLIENT_ACCOUNTS_PROTOTYPE[client.value.name] ?? EMPTY_ACCOUNT) : EMPTY_ACCOUNT));
const lots = computed(() => [
  ...lotStore.lots
    .filter((lot) => lot.clientId === client.value?.id)
    .map((lot) => ({ code: lot.code, status: lot.status === 'received' ? 'Reçu' : 'En attente', kg: lot.netKg })),
  ...account.value.history.filter((item) => !lotStore.lots.some((lot) => lot.code === item.code)),
]);

// watchers
watch(
  () => siteStore.currentSite?.id,
  (siteId) => {
    if (siteId) receptionStore.fetchSite(siteId);
  },
  { immediate: true },
);

// event handlers
const handleAction = (key: string): void => {
  if (key === 'reception') {
    router.push({ name: 'reception-new', query: { client: String(route.params.id) } });
    return;
  }
  const next = key === 'withdrawal' && account.value.dueDh ? ' Ensuite : « Encaisser » les frais dus.' : '';
  toastStore.push(`Prototype : écran « ${key === 'withdrawal' ? 'Retrait' : key === 'payment' ? 'Encaisser' : 'Payer'} » décidé, à construire.${next}`, 'info');
};
</script>
