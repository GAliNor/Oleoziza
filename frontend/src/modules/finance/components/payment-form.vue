<template>
  <no-open-season v-if="seasonStore.isLoaded && !seasonStore.openSeason" action="payment" />
  <form v-else :ref="setFormRoot" class="card flex flex-col gap-4" novalidate @submit.prevent="handleSave">
    <h2 class="heading-four">{{ $t('finance.form.title') }}</h2>

    <p v-if="creditDh" class="rounded-control bg-info-subtle p-3 body-two text-fg-info tabular-nums" role="status">{{ $t('finance.form.credit', { amount: formatMoney(creditDh) }) }}</p>

    <div data-field="lots">
      <due-lot-picker v-model="tickedIds" :lots="dueLots" :title="$t('finance.form.lots')" :can-discount="siteStore.can('discount.give')" @discount="handleDiscount" />
      <p v-if="dueLots.length && errorOf('lots')" class="form-error pt-2" role="alert">{{ errorOf('lots') }}</p>
    </div>

    <discount-form
      v-if="discountLot"
      :key="discountLot.id"
      :lot="discountLot"
      :limit-percent="configuration?.discountLimit ?? 0"
      @close="discountLot = null"
      @saved="handleDiscountSaved"
    />

    <template v-if="dueLots.length">
      <ui-field v-slot="{ id, describedBy, isInvalid }" name="amount" :label="$t('finance.form.amount')" :error="errorOf('amount')" :is-valid="isValid('amount')" @leave="touch('amount')">
        <div class="relative">
          <input :id="id" v-model.number="amount" class="input pe-14 text-xl figure" type="number" inputmode="decimal" min="0" step="0.01" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
          <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('global.units.dirham') }}</span>
        </div>
        <p v-if="isPartial" class="body-two">{{ $t('finance.form.allocation') }}</p>
      </ui-field>

      <section class="flex flex-col gap-2" data-field="method">
        <h3 class="label">{{ $t('finance.form.method') }}</h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button v-for="option in enabledMethods" :key="option.key" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': method === option.key }" :aria-pressed="method === option.key" @click="method = option.key">
            {{ $t(`finance.methods.${option.key}`) }}
          </button>
        </div>
        <p v-if="!method && errorOf('method')" class="form-error" role="alert">{{ errorOf('method') }}</p>
        <p v-if="method" class="body-two" role="status">{{ $t(isFinal ? 'finance.form.finalNow' : 'finance.form.waitsConfirmation') }}</p>
      </section>

      <ui-field v-if="method === 'cheque' || method === 'transfer'" v-slot="{ id }" :label="$t(`finance.form.reference.${method}`)" is-optional>
        <input :id="id" v-model="reference" class="input" type="text" />
      </ui-field>

      <template v-if="method === 'oil'">
        <p class="body-two">{{ $t('finance.form.oilQuantity', { quantity: formatOil(oilLitres), price: formatMoney(oilPrice) }) }}</p>
        <p v-if="isOilTooMuch" class="form-error" role="alert">{{ $t('finance.form.oilTooMuch', { quantity: formatOil(oilStockLitres) }) }}</p>
      </template>

      <div v-if="method" class="flex flex-col gap-2" data-field="proof">
        <ui-photo-capture v-model="proofUrl" :label="$t('finance.form.proof')" :is-required="needsProof" />
        <p v-if="errorOf('proof')" class="form-error" role="alert">{{ errorOf('proof') }}</p>
        <p v-else-if="needsProof && !proofUrl" class="body-two">{{ $t('finance.form.proofRequired') }}</p>
      </div>

      <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="financeStore.isSaving" :submit-label="$t('finance.form.save', { amount: formatMoney(typedAmount) })" @jump="jumpTo" @submit="handleSave">
        <template #actions>
          <button type="button" class="btn-secondary min-h-13" @click="emit('close')">{{ $t('finance.form.cancel') }}</button>
        </template>
      </ui-form-bar>
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
import { useSeasonStore } from 'season/stores/season';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { allocatePayment } from 'finance/composables/allocate-payment';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { createId } from 'global/composables/crypto';
import { formatMoney } from 'global/composables/money';
import { amountDue } from 'lot/composables/fee';
import { formatOil } from 'lot/composables/quantity';
import type { IConfiguration, IPaymentMethodSetting } from 'configuration/types/configuration';
import type { IFormRule } from 'global/types/form';
import type { PaymentMethodKey } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

import DueLotPicker from 'finance/components/due-lot-picker.vue';
import DiscountForm from 'lot/components/discount-form.vue';
import NoOpenSeason from 'season/components/no-open-season.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import UiPhotoCapture from 'global/components/ui-photo-capture.vue';

// props
/** lotIds: the Lots ticked when the form opens, from a Lot or a task; the Caisse opens with none. */
const props = defineProps<{ clientId: string; clientName: string; siteId: string; oilStockLitres: number; creditDh: number; lotIds?: string[] }>();

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
const seasonStore = useSeasonStore();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();

// variables
const paymentId = ref(createId());
const tickedIds = ref<string[]>([...(props.lotIds ?? [])]);
const amount = ref<number | ''>('');
const method = ref<PaymentMethodKey | null>(null);
const reference = ref('');
const proofUrl = ref<string | null>(null);
const discountLot = ref<ILot | null>(null);

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
const isFinal = computed((): boolean => method.value === 'cash' && siteStore.can('payment.confirm'));
const isOilTooMuch = computed((): boolean => method.value === 'oil' && oilLitres.value > props.oilStockLitres);
const methodErrorComputed = computed((): string | null => {
  if (!method.value) return null;
  return isOilTooMuch.value ? t('finance.form.oilTooMuch', { quantity: formatOil(props.oilStockLitres) }) : null;
});
const rulesComputed = computed((): IFormRule[] => [
  { key: 'lots', label: t('finance.form.lots'), isMissing: !tickedLots.value.length },
  { key: 'amount', label: t('finance.form.amount'), isMissing: !typedAmount.value, error: isAmountTooHigh.value && tickedLots.value.length ? t('finance.form.amountTooHigh', { total: formatMoney(tickedTotal.value) }) : null, isFilled: true },
  { key: 'method', label: t('finance.form.method'), isMissing: !method.value, error: methodErrorComputed.value },
  { key: 'proof', label: t('finance.form.proof'), isMissing: needsProof.value && !proofUrl.value },
]);
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt } = useFormFeedback(() => rulesComputed.value);

// watchers
watch(
  tickedTotal,
  (total) => {
    amount.value = total || '';
  },
  { immediate: true },
);

watch(
  () => props.siteId,
  (siteId) => {
    if (siteId) configurationStore.fetchSites([siteId]);
  },
  { immediate: true },
);

// event handlers
const handleDiscount = (lot: ILot): void => {
  discountLot.value = lot;
};

/** A Discount over the limit waits for Management, and its Lot can't be paid meanwhile. */
const handleDiscountSaved = (lot: ILot): void => {
  discountLot.value = null;
  if (lot.discount?.state === 'pending') tickedIds.value = tickedIds.value.filter((id) => id !== lot.id);
};

const save = async (): Promise<void> => {
  if (!method.value) return;
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
  toastStore.push(t(movement.status === 'confirmed' ? 'finance.form.savedFinal' : 'finance.form.saved', { code: movement.code }), 'success');
  emit('saved');
};

const handleSave = (): void => attempt(save);
</script>
