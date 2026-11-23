<template>
  <no-open-season v-if="seasonStore.isLoaded && !seasonStore.openSeason" action="payment" />
  <form v-else :ref="setFormRoot" class="card flex flex-col gap-4" novalidate @submit.prevent="handleSave">
    <header>
      <h2 class="heading-four">{{ $t('finance.direct.title') }}</h2>
      <p class="body-two">{{ $t('finance.direct.hint') }}</p>
    </header>

    <section class="flex flex-col gap-2" data-field="client">
      <h3 class="label">{{ $t('finance.register.columns.client') }}</h3>
      <client-picker v-model="client" :site-id="siteId" hide-create />
      <p v-if="errorOf('client')" class="form-error" role="alert">{{ errorOf('client') }}</p>
    </section>

    <ui-field v-slot="{ id, describedBy, isInvalid }" name="amount" :label="$t('finance.form.amount')" :error="errorOf('amount')" :is-valid="isValid('amount')" @leave="touch('amount')">
      <div class="relative">
        <input :id="id" v-model.number="amount" class="input pe-14 text-xl figure" type="number" inputmode="decimal" min="0" step="0.01" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
        <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('global.units.dirham') }}</span>
      </div>
    </ui-field>

    <section class="flex flex-col gap-2">
      <h3 class="label">{{ $t('finance.form.method') }}</h3>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button v-for="option in BANKED_METHODS" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': method === option }" @click="method = option">
          {{ $t(`finance.methods.${option}`) }}
        </button>
      </div>
    </section>

    <ui-field v-if="method !== 'cash'" v-slot="{ id }" :label="$t(`finance.form.reference.${method}`)" is-optional>
      <input :id="id" v-model="reference" class="input" type="text" />
    </ui-field>

    <due-lot-picker v-if="client" v-model="tickedIds" :lots="dueLots" :title="$t('finance.direct.lots')" />
    <p v-if="client && surplus > 0" class="body-two">{{ tickedIds.length ? $t('finance.direct.surplus', { amount: formatMoney(surplus) }) : $t('finance.direct.noLots') }}</p>

    <section class="flex flex-col gap-2">
      <h3 class="label">{{ $t('finance.documents.title') }}</h3>
      <document-list :documents="documents" :empty-message="$t('finance.documents.none')" can-add @add="handleAddFiles" />
    </section>

    <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="financeStore.isSaving" :submit-label="$t('finance.form.save', { amount: formatMoney(typedAmount) })" @jump="jumpTo" @submit="handleSave">
      <template #actions>
        <button type="button" class="btn-secondary min-h-13" @click="emit('close')">{{ $t('finance.form.cancel') }}</button>
      </template>
    </ui-form-bar>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClientStore } from 'client/stores/client';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSeasonStore } from 'season/stores/season';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { allocatePayment } from 'finance/composables/allocate-payment';
import { readFiles } from 'global/composables/read-files';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { createId } from 'global/composables/crypto';
import { formatMoney } from 'global/composables/money';
import { amountDue } from 'lot/composables/fee';
import type { IClient } from 'client/types/client';
import type { IMovement, IPaymentDocument, PaymentMethodKey } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

import NoOpenSeason from 'season/components/no-open-season.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import ClientPicker from 'reception/components/client-picker.vue';
import DocumentList from 'finance/components/document-list.vue';
import DueLotPicker from 'finance/components/due-lot-picker.vue';

// props
const props = defineProps<{ siteId: string }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'saved', movement: IMovement): void;
}>();

// stores
const { t } = useI18n();
const clientStore = useClientStore();
const financeStore = useFinanceStore();
const lotStore = useLotStore();
const seasonStore = useSeasonStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const BANKED_METHODS: PaymentMethodKey[] = ['transfer', 'cheque', 'cash'];
const paymentId = createId();
const client = ref<IClient | null>(null);
const amount = ref<number | ''>('');
const method = ref<PaymentMethodKey>('transfer');
const reference = ref('');
const tickedIds = ref<string[]>([]);
const documents = ref<IPaymentDocument[]>([]);

// computed
const typedAmount = computed((): number => (typeof amount.value === 'number' ? amount.value : 0));
const dueLots = computed((): ILot[] => lotStore.lots.filter((lot) => lot.clientId === client.value?.id && amountDue(lot) > 0));
const lotLinks = computed(() => allocatePayment(dueLots.value.filter((lot) => tickedIds.value.includes(lot.id)), typedAmount.value));
const surplus = computed((): number => typedAmount.value - lotLinks.value.reduce((sum, link) => sum + link.amount, 0));
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt } = useFormFeedback(() => [
  { key: 'client', label: t('finance.register.columns.client'), isMissing: !client.value },
  { key: 'amount', label: t('finance.form.amount'), isMissing: !typedAmount.value, isFilled: true },
]);

// lifecycle
clientStore.fetchClients();

// watchers
watch(client, () => {
  tickedIds.value = [];
});

// event handlers
const handleAddFiles = async (files: File[]): Promise<void> => {
  documents.value = [...documents.value, ...(await readFiles(files, sessionStore.fullName))];
};

const save = async (): Promise<void> => {
  if (!client.value) return;
  const movement = await financeStore.recordPayment({
    id: paymentId,
    siteId: props.siteId,
    clientId: client.value.id,
    client: client.value.name,
    lotLinks: lotLinks.value,
    amount: typedAmount.value,
    method: method.value,
    reference: reference.value.trim() || undefined,
    documents: documents.value,
  });
  if (!movement) {
    toastStore.push(t('finance.form.error'), 'danger');
    return;
  }
  toastStore.push(t('finance.form.saved', { code: movement.code }), 'success');
  emit('saved', movement);
};

const handleSave = (): void => attempt(save);
</script>
