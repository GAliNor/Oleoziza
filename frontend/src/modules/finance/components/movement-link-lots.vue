<template>
  <form class="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-hairline" @submit.prevent="handleSave">
    <due-lot-picker v-model="tickedIds" :lots="lots" :title="$t('finance.link.title')" />
    <p v-if="tickedIds.length && surplus > 0" class="body-two">{{ $t('finance.direct.surplus', { amount: formatMoney(surplus) }) }}</p>
    <button type="submit" class="btn-secondary self-end" :disabled="!tickedIds.length || !isOnline || financeStore.isSaving">{{ $t('finance.link.save') }}</button>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useToastStore } from 'global/stores/toast';
import { allocatePayment } from 'finance/composables/allocate-payment';
import { surplusOf } from 'finance/composables/settle';
import { formatMoney } from 'global/composables/money';
import { amountDue } from 'lot/composables/fee';
import type { IMovement } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

import DueLotPicker from 'finance/components/due-lot-picker.vue';

// props
const props = defineProps<{ movement: IMovement; isOnline: boolean }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const lotStore = useLotStore();
const toastStore = useToastStore();

// variables
const tickedIds = ref<string[]>([]);

// computed
const lots = computed((): ILot[] => lotStore.lots.filter((lot) => lot.clientId === props.movement.clientId && amountDue(lot) > 0));
const links = computed(() => allocatePayment(lots.value.filter((lot) => tickedIds.value.includes(lot.id)), props.movement.amount));
const surplus = computed((): number => surplusOf({ amount: props.movement.amount, lotLinks: links.value }));

// event handlers
const handleSave = async (): Promise<void> => {
  const updated = await financeStore.linkLots(props.movement, links.value);
  toastStore.push(t(updated ? 'finance.link.saved' : 'finance.toasts.error'), updated ? 'success' : 'danger');
  if (updated) tickedIds.value = [];
};
</script>
