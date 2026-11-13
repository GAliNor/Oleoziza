<template>
  <sales-tiles v-if="figures" v-show="!isOpen" class="rise" :figures="figures" :period-label="period.label" can-open-pending :is-active="tab === 'pending'" @pending="handleTab('pending')" />

  <div v-show="!isOpen" class="rise flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <input v-model="search" class="input md:max-w-xs" type="search" :placeholder="$t('finance.register.search')" />
    <ui-segmented class="shrink-0 self-start md:self-auto" variant="tabs" :model-value="tab" :options="tabOptions" :label="$t('finance.register.tabsLabel')" @update:model-value="handleTab">
      <template #option="{ option }">
        {{ option.label }}
        <span v-if="option.key === 'pending'" class="chip ms-1 bg-warning-subtle text-fg-warning">{{ pending.length }}</span>
        <span v-else-if="option.key === 'refunds' && refundsToHandle" class="chip ms-1 bg-warning-subtle text-fg-warning">{{ refundsToHandle }}</span>
      </template>
    </ui-segmented>
  </div>

  <direct-payment-form v-if="isRecording && siteStore.currentSiteId" v-show="!isOpen" :site-id="siteStore.currentSiteId" @close="isRecording = false" @saved="handleDirectSaved" />
  <button v-else-if="canRecordDirect" v-show="!isOpen" type="button" class="btn-primary self-start" @click="isRecording = true">{{ $t('finance.direct.open') }}</button>

  <template v-if="tab === 'refunds' && !isOpen">
    <div v-if="refundList.isLoading && !refundList.items.length" class="flex flex-col gap-3">
      <div v-for="index in 3" :key="index" class="skeleton h-28 rounded-card" />
    </div>
    <TransitionGroup v-else tag="ul" name="row-in" class="flex flex-col gap-3">
      <li v-for="refund in refundList.items" :key="refund.id"><refund-card :refund="refund" :is-read-only="siteStore.isAllSites" :is-online="isOnline" /></li>
      <li v-if="!refundList.items.length" key="empty"><ui-empty-state :message="$t('finance.refunds.empty')" /></li>
    </TransitionGroup>
    <ui-load-more :shown="refundList.items.length" :total="refundList.total" :is-loading="refundList.isLoadingMore" @more="financeStore.fetchMoreRefunds()" />
  </template>

  <ui-master-detail v-if="tab !== 'refunds' || isOpen" :is-open="isOpen" :back-label="$t('finance.register.back')" @close="handleClose">
    <template #list>
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th class="px-4 py-3 font-semibold">{{ $t('finance.register.columns.date') }}</th>
              <th class="px-4 py-3 font-semibold">{{ $t('finance.register.columns.client') }}</th>
              <th class="hidden px-4 py-3 font-semibold lg:table-cell">{{ $t('finance.register.columns.label') }}</th>
              <th class="hidden px-4 py-3 font-semibold md:table-cell">{{ $t('finance.register.columns.method') }}</th>
              <th class="hidden px-4 py-3 font-semibold xl:table-cell">{{ $t('finance.register.columns.recordedBy') }}</th>
              <th class="px-4 py-3 text-end font-semibold">{{ $t('finance.register.columns.amount') }}</th>
              <th class="hidden px-4 py-3 font-semibold sm:table-cell">{{ $t('finance.register.columns.status') }}</th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="row-in" class="transition-opacity duration-200" :class="{ 'opacity-50': registerList.isLoading && registerList.items.length }">
            <tr
              v-for="movement in registerList.items"
              :key="movement.id"
              class="data-row"
              :class="{ 'bg-selected/40': movement.id === lastId }"
              tabindex="0"
              @click="handleOpen(movement.id)"
              @keydown.enter="handleOpen(movement.id)"
            >
              <td class="px-4 py-3 whitespace-nowrap text-fg-primary-paragraph">{{ formatDateTime(movement.recordedAt) }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-fg-display">{{ movement.client }}</p>
                <p class="body-two">{{ movement.code }}<span class="lg:hidden"> · {{ $t(`finance.purposes.${movement.purpose}`) }}</span></p>
              </td>
              <td class="hidden px-4 py-3 text-fg-primary-paragraph lg:table-cell">{{ movementLabel(movement) }}</td>
              <td class="hidden px-4 py-3 whitespace-nowrap md:table-cell">
                {{ $t(`finance.methods.${movement.method}`) }}
                <span v-if="movement.documents.length" class="chip ms-1 bg-subtle text-fg-primary-paragraph">{{ $t('finance.register.documents', movement.documents.length) }}</span>
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph xl:table-cell">{{ movement.recordedBy }}</td>
              <td class="px-4 py-3 text-end font-semibold whitespace-nowrap tabular-nums" :class="movement.kind === 'payment' ? 'text-fg-brand' : 'text-fg-accent'">
                {{ movement.kind === 'payment' ? '+' : '−' }}{{ formatMoney(movement.amount) }}
              </td>
              <td class="hidden px-4 py-3 whitespace-nowrap sm:table-cell"><span class="chip" :class="MOVEMENT_STATUS_TONES[movement.status]">{{ $t(`finance.statuses.${movement.status}`) }}</span></td>
            </tr>
          </TransitionGroup>
        </table>
        <div v-if="registerList.isLoading && !registerList.items.length" class="flex flex-col gap-2 p-3">
          <div v-for="index in 5" :key="index" class="skeleton h-12 rounded-control" />
        </div>
        <ui-empty-state v-else-if="!registerList.items.length" :message="$t(tab === 'pending' ? 'finance.register.emptyPending' : 'finance.register.emptyAll')" />
      </div>
      <ui-load-more :shown="registerList.items.length" :total="registerList.total" :is-loading="registerList.isLoadingMore" @more="financeStore.fetchMoreRegister()" />
    </template>
    <template v-if="steps.total" #actions>
      <pending-pager class="w-full sm:ms-auto sm:w-auto" :steps="steps" @open="handleOpen" />
    </template>
    <template v-if="active" #detail>
      <movement-detail :key="active.id" :movement="active" />
    
    </template>
  </ui-master-detail>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useFinanceStore } from 'finance/stores/finance';
import { useSiteStore } from 'site/stores/site';
import { useFinance } from 'finance/composables/use-finance';
import { movementLabel } from 'finance/composables/movement-label';
import { pendingSteps } from 'finance/composables/pending-steps';
import { MOVEMENT_STATUS_TONES } from 'finance/constants/finance';
import type { IMovement, IPendingSteps, MovementList } from 'finance/types/finance';
import { formatMoney } from 'global/composables/money';
import { formatDateTime } from 'global/composables/date';

import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiLoadMore from 'global/components/ui-load-more.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import SalesTiles from 'finance/components/sales-tiles.vue';
import DirectPaymentForm from 'finance/components/direct-payment-form.vue';
import MovementDetail from 'finance/components/movement-detail.vue';
import RefundCard from 'finance/components/refund-card.vue';
import PendingPager from 'finance/components/pending-pager.vue';

// stores
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const financeStore = useFinanceStore();
const siteStore = useSiteStore();
const { pending, figures, period, isOnline } = useFinance();

// variables
type RegisterTab = MovementList | 'refunds';
const SEARCH_DELAY_MS = 250;
const isRecording = ref(false);
const search = ref('');
const searched = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const lastId = ref<string | null>(null);

// computed
const canRefund = computed((): boolean => siteStore.can('refund.manage'));
const tabOptions = computed((): { key: RegisterTab; label: string }[] => [
  { key: 'pending', label: t('finance.register.tabs.pending') },
  { key: 'all', label: t('finance.register.tabs.all') },
  ...(canRefund.value ? [{ key: 'refunds' as const, label: t('finance.register.tabs.refunds') }] : []),
]);
const tab = computed((): RegisterTab => {
  if (route.query.tab === 'refunds' && canRefund.value) return 'refunds';
  return route.query.tab === 'all' ? 'all' : 'pending';
});
const refundsToHandle = computed((): number => financeStore.refunds.filter((refund) => refund.status !== 'confirmed').length);
const canRecordDirect = computed((): boolean => !siteStore.isAllSites && siteStore.can('payment.record'));
const registerList = computed(() => financeStore.registerList);
const refundList = computed(() => financeStore.refundList);
const openId = computed((): string | null => (typeof route.query.movement === 'string' ? route.query.movement : null));
const isOpen = computed((): boolean => find(openId.value) !== undefined);
const active = computed((): IMovement | undefined => find(openId.value ?? lastId.value));
const steps = computed((): IPendingSteps => pendingSteps(pending.value, find(openId.value)));

// watchers
watch(search, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searched.value = value.trim();
  }, SEARCH_DELAY_MS);
});

/** Each tab loads only once it is opened, and again when the Site, the period or the search changes. */
watch(
  [() => siteStore.currentSiteId, tab, searched, () => period.value.key],
  ([siteId, currentTab, text, periodKey]) => {
    if (!siteId) return;
    if (currentTab === 'refunds') financeStore.fetchRefundPage(siteId);
    else financeStore.fetchRegister({ siteId, list: currentTab, search: text, period: periodKey });
  },
  { immediate: true },
);
watch(
  openId,
  (id) => {
    if (id) lastId.value = id;
  },
  { immediate: true },
);

// methods
const find = (id: string | null): IMovement | undefined => financeStore.movements.find((movement) => movement.id === id);

// event handlers
const handleTab = (key: RegisterTab): void => {
  router.replace({ query: { ...route.query, tab: key === 'pending' ? undefined : key, movement: undefined } });
};

const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, movement: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleDirectSaved = (movement: IMovement): void => {
  isRecording.value = false;
  handleOpen(movement.id);
};

const handleClose = (): void => {
  router.replace({ query: { ...route.query, movement: undefined } });
};
</script>
