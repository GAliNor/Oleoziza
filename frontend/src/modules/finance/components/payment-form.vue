<template>
  <form class="card flex flex-col gap-4" @submit.prevent="handleSave">
    <h2 class="heading-four">{{ $t('finance.form.title') }}</h2>

    <p v-if="creditDh" class="rounded-control bg-info-subtle p-3 body-two text-fg-info tabular-nums" role="status">{{ $t('finance.form.credit', { amount: formatMoney(creditDh) }) }}</p>

    <due-lot-picker v-model="tickedIds" :lots="dueLots" :title="$t('finance.form.lots')" />

    <template v-if="dueLots.length">
      <ui-field v-slot="{ id }" :label="$t('finance.form.amount')">
        <div class="relative">
          <input :id="id" v-model.number="amount" class="input pe-14 text-xl figure" type="number" inputmode="decimal" min="0" step="0.01" :aria-invalid="isAmountTooHigh" />
          <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('global.units.dirham') }}</span>
        </div>
        <p v-if="isAmountTooHigh" class="form-error">{{ $t('finance.form.amountTooHigh', { total: formatMoney(tickedTotal) }) }}</p>
        <p v-else-if="isPartial" class="body-two">{{ $t('finance.form.allocation') }}</p>
      </ui-field>

      <section class="flex flex-col gap-2">
        <h3 class="label">{{ $t('finance.form.method') }}</h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button v-for="option in enabledMethods" :key="option.key" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': method === option.key }" @click="method = option.key">
            {{ $t(`finance.methods.${option.key}`) }}
          </button>
        </div>
      </section>

      <ui-field v-if="method === 'cheque' || method === 'transfer'" v-slot="{ id }" :label="$t(`finance.form.reference.${method}`)">
        <input :id="id" v-model="reference" class="input" type="text" />
      </ui-field>

      <template v-if="method === 'oil'">
        <p class="body-two">{{ $t('finance.form.oilQuantity', { quantity: formatOil(oilLitres), price: formatMoney(oilPrice) }) }}</p>
        <p v-if="isOilTooMuch" class="form-error">{{ $t('finance.form.oilTooMuch', { quantity: formatOil(oilStockLitres) }) }}</p>
      </template>

      <template v-if="method">
        <ui-photo-capture v-model="proofUrl" :label="$t('finance.form.proof')" :is-required="needsProof" />
        <p v-if="needsProof && !proofUrl" class="body-two">{{ $t('finance.form.proofRequired') }}</p>
      </template>

      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('finance.form.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="!canSave">{{ $t('finance.form.save', { amount: formatMoney(typeof amount === 'number' ? amount : 0) }) }}</button>
      </div>
    </template>
    <button v-else type="button" class="btn-secondary" @click="emit('close')">{{ $t('finance.form.cancel') }}</button>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { allocatePayment } from 'finance/composables/allocate-payment';
import { createId } from 'global/composables/crypto';
import { formatMoney } from 'global/composables/money';
import { amountDue } from 'lot/composables/fee';
import { formatOil } from 'lot/composables/quantity';
import type { IConfiguration, IPaymentMethodSetting } from 'configuration/types/configuration';
import type { PaymentMethodKey } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

import DueLotPicker from 'finance/components/due-lot-picker.vue';
import UiField from 'global/components/ui-field.vue';
import UiPhotoCapture from 'global/components/ui-photo-capture.vue';

// props
const props = defineProps<{ clientId: string; clientName: string; siteId: string; oilStockLitres: number; creditDh: number }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'saved'): void;
}>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const financeStore = useFinanceStore();
const lotStore = useLotStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const paymentId = ref(createId());
const tickedIds = ref<string[]>([]);
const amount = ref<number | ''>('');
const method = ref<PaymentMethodKey | null>(null);
const reference = ref('');
const proofUrl = ref<string | null>(null);

// computed
const configuration = computed((): IConfiguration | undefined => configurationStore.bySite[props.siteId]);
const enabledMethods = computed((): IPaymentMethodSetting[] => configuration.value?.methods.filter((item) => item.isEnabled) ?? []);
const oilPrice = computed((): number => configuration.value?.oilPrice ?? 0);
const dueLots = computed((): ILot[] =>
  lotStore.lots
    .filter((lot) => lot.clientId === props.clientId && amountDue(lot) > 0)
    .sort((first, second) => first.receivedAt.localeCompare(second.receivedAt)),
);
const tickedLots = computed((): ILot[] => dueLots.value.filter((lot) => tickedIds.value.includes(lot.id)));
const tickedTotal = computed((): number => tickedLots.value.reduce((sum, lot) => sum + amountDue(lot), 0));
const typedAmount = computed((): number => (typeof amount.value === 'number' ? amount.value : 0));
const isAmountTooHigh = computed((): boolean => typedAmount.value > tickedTotal.value + 0.001);
const isPartial = computed((): boolean => typedAmount.value > 0 && typedAmount.value < tickedTotal.value);
const needsProof = computed((): boolean => enabledMethods.value.find((item) => item.key === method.value)?.needsProof ?? false);
const oilLitres = computed((): number => (oilPrice.value ? Math.round((typedAmount.value / oilPrice.value) * 100) / 100 : 0));
const isOilTooMuch = computed((): boolean => method.value === 'oil' && oilLitres.value > props.oilStockLitres);
const canSave = computed((): boolean =>
  !!method.value &&
  typedAmount.value > 0 &&
  !isAmountTooHigh.value &&
  !isOilTooMuch.value &&
  (!needsProof.value || !!proofUrl.value) &&
  !financeStore.isSaving,
);

// watchers
watch(tickedTotal, (total) => {
  amount.value = total || '';
});

watch(
  () => props.siteId,
  (siteId) => {
    if (siteId) configurationStore.fetchSites([siteId]);
  },
  { immediate: true },
);

// event handlers
const handleSave = async (): Promise<void> => {
  if (!canSave.value || !method.value) return;
  const movement = await financeStore.recordPayment({
    id: paymentId.value,
    siteId: props.siteId,
    clientId: props.clientId,
    client: props.clientName,
    lotLinks: allocatePayment(tickedLots.value, typedAmount.value),
    amount: typedAmount.value,
    method: method.value,
    reference: reference.value.trim() || undefined,
    oilLitres: method.value === 'oil' ? oilLitres.value : undefined,
    documents: proofUrl.value ? [{ id: createId(), name: t('finance.form.proof'), url: proofUrl.value, isPdf: false, addedBy: sessionStore.fullName, addedAt: new Date().toISOString() }] : [],
  });
  if (!movement) {
    toastStore.push(t('finance.form.error'), 'danger');
    return;
  }
  toastStore.push(t('finance.form.saved', { code: movement.code }), 'success');
  emit('saved');
};
</script>
