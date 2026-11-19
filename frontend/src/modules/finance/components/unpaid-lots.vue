<template>
  <ui-master-detail :is-open="isOpen" :back-label="$t('finance.unpaid.back')" @close="closeLot">
    <template #list>
      <p v-if="rowsComputed.length" class="body-two tabular-nums">{{ $t('finance.unpaid.summary', { count: rowsComputed.length, amount: formatMoney(totalComputed) }) }}</p>
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th class="px-4 py-3 font-semibold">{{ $t('finance.unpaid.columns.lot') }}</th>
              <th class="px-4 py-3 font-semibold">{{ $t('finance.unpaid.columns.client') }}</th>
              <th class="hidden px-4 py-3 font-semibold md:table-cell">{{ $t('finance.unpaid.columns.age') }}</th>
              <th class="px-4 py-3 text-end font-semibold">{{ $t('finance.unpaid.columns.due') }}</th>
              <th class="hidden px-4 py-3 font-semibold sm:table-cell">{{ $t('finance.unpaid.columns.state') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lot in pageRows"
              :key="lot.id"
              class="data-row"
              :class="{ 'bg-selected/40': lot.id === lastId }"
              tabindex="0"
              @click="openLot(lot.id)"
              @keydown.enter="openLot(lot.id)"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-fg-display tabular-nums">{{ lot.code }}</p>
                <p class="body-two">{{ formatShortDate(lot.receivedAt) }}</p>
              </td>
              <td class="px-4 py-3 font-medium text-fg-display">{{ lot.clientName }}</td>
              <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph md:table-cell">{{ ageLabel(lot) }}</td>
              <td class="px-4 py-3 text-end font-semibold whitespace-nowrap text-fg-warning tabular-nums">{{ formatMoney(amountDue(lot)) }}</td>
              <td class="hidden px-4 py-3 whitespace-nowrap sm:table-cell">
                <span class="chip" :class="PAYMENT_STATE_TONES[paymentStateOf(lot)]">{{ $t(`lot.payment.${paymentStateOf(lot)}`) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="lotStore.isLoading && !rowsComputed.length" class="flex flex-col gap-2 p-3">
          <div v-for="index in 5" :key="index" class="skeleton h-12 rounded-control" />
        </div>
        <ui-empty-state v-else-if="!rowsComputed.length" :message="$t('finance.unpaid.empty')" />
      </div>
      <ui-pagination v-model:page="page" :page-count="pageCount" :total="rowsComputed.length" :page-size="PAGE_SIZE" />
    </template>
    <template v-if="active" #detail>
      <lot-detail :key="active.id" :lot="active" />
    </template>
  </ui-master-detail>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { useOpenLot } from 'lot/composables/use-lot-register';
import { usePagedRows } from 'global/composables/use-paged-rows';
import { amountDue, paymentStateOf } from 'lot/composables/fee';
import { daysSince, formatShortDate } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { PAYMENT_STATE_TONES } from 'lot/constants/lot';
import type { ILot } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import LotDetail from 'lot/components/lot-detail.vue';

// props
const props = defineProps<{ search: string }>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();
const siteStore = useSiteStore();
const { isOpen, active, lastId, openLot, closeLot } = useOpenLot();

// variables
const PAGE_SIZE = 25;

// computed
const rowsComputed = computed((): ILot[] => {
  const text = props.search.trim().toLowerCase();
  return lotStore.lots
    .filter((lot) => lot.mode === 'service_milling' && amountDue(lot) > 0)
    .filter((lot) => siteStore.isAllSites || lot.siteId === siteStore.currentSiteId)
    .filter((lot) => !text || lot.code.toLowerCase().includes(text) || lot.clientName.toLowerCase().includes(text))
    .sort((first, second) => first.receivedAt.localeCompare(second.receivedAt));
});
const totalComputed = computed((): number => rowsComputed.value.reduce((sum, lot) => sum + amountDue(lot), 0));
const { page, pageCount, pageRows } = usePagedRows(rowsComputed, PAGE_SIZE);

// methods
const ageLabel = (lot: ILot): string => {
  const days = daysSince(lot.receivedAt);
  return days ? t('finance.unpaid.days', days) : t('finance.unpaid.today');
};

const fetchLots = (siteId: string | null): void => {
  if (siteId) lotStore.fetchLots(siteId);
};

watch(() => siteStore.currentSiteId, fetchLots, { immediate: true });
</script>
