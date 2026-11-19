<template>
  <section class="card flex flex-col gap-5 p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 class="label">{{ $t('lot.money.title') }}</h3>
      <p class="font-semibold tabular-nums" :class="dueComputed ? 'text-fg-warning' : 'text-fg-brand'">
        {{ dueComputed ? $t('lot.money.due', { amount: formatMoney(dueComputed) }) : $t('lot.money.settled') }}
      </p>
    </div>

    <div v-if="actionsComputed.length && !panel" class="flex flex-wrap gap-2">
      <button
        v-for="action in actionsComputed"
        :key="action"
        type="button"
        :class="action === 'pay' ? 'btn-primary' : 'btn-secondary'"
        @click="handleOpen(action)"
      >
        {{ $t(`lot.money.actions.${action}`) }}
      </button>
    </div>
    <p v-if="isDiscountPending(lot) && !panel" class="body-two rounded-control bg-warning-subtle p-3 text-fg-warning">{{ $t('lot.money.discountPending') }}</p>

    <quick-payment
      v-if="panel === 'pay'"
      :client-id="lot.clientId"
      :client-name="lot.clientName"
      :site-id="lot.siteId"
      :lot-ids="[lot.id]"
      @close="panel = null"
      @saved="panel = null"
    />
    <discount-form
      v-else-if="panel === 'discount'"
      :lot="lot"
      :limit-percent="configurationStore.bySite[lot.siteId]?.discountLimit ?? 0"
      @close="panel = null"
      @saved="panel = null"
    />
    <rate-form v-else-if="panel === 'rate'" :lot="lot" @close="panel = null" @saved="panel = null" />

    <lot-payments v-if="isPaymentsShown" :lot="lot" />
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useSiteStore } from 'site/stores/site';
import { formatMoney } from 'global/composables/money';
import { amountDue, canCorrectRate, isDiscountPending } from 'lot/composables/fee';
import type { Permission } from 'global/types/session';
import type { ILot } from 'lot/types/lot';

import DiscountForm from 'lot/components/discount-form.vue';
import RateForm from 'lot/components/rate-form.vue';
import LotPayments from 'finance/components/lot-payments.vue';
import QuickPayment from 'finance/components/quick-payment.vue';

// props
const props = defineProps<{ lot: ILot }>();

// stores
const configurationStore = useConfigurationStore();
const siteStore = useSiteStore();

// variables
type MoneyAction = 'pay' | 'discount' | 'rate';
const panel = ref<MoneyAction | null>(null);

// computed
const dueComputed = computed((): number => amountDue(props.lot));
const hasDiscountComputed = computed((): boolean => !!props.lot.discount && props.lot.discount.state !== 'refused');
const actionsComputed = computed((): MoneyAction[] => {
  const actions: MoneyAction[] = [];
  if (can('payment.record') && dueComputed.value > 0 && !isDiscountPending(props.lot)) actions.push('pay');
  if (can('discount.give') && dueComputed.value > 0 && !hasDiscountComputed.value) actions.push('discount');
  if (can('lot.set_price') && canCorrectRate(props.lot)) actions.push('rate');
  return actions;
});
const isPaymentsShown = computed((): boolean => can('finance.view') || can('payment.record'));

// watchers
watch(
  () => props.lot.id,
  () => {
    panel.value = null;
  },
);

// methods
const can = (permission: Permission): boolean => siteStore.hasPermission(permission, props.lot.siteId);

// event handlers
const handleOpen = (action: MoneyAction): void => {
  if (action === 'discount') configurationStore.fetchSites([props.lot.siteId]);
  panel.value = action;
};
</script>
