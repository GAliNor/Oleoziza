<template>
  <article class="card flex flex-col gap-3">
    <header class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="heading-five truncate">{{ refund.client }}</h3>
        <p class="body-two">{{ $t('finance.refunds.source', { code: refund.sourceCode, date: formatFullDate(refund.createdAt) }) }}</p>
      </div>
      <div class="flex flex-col items-end gap-1">
        <span class="text-xl figure text-fg-display">{{ formatMoney(refund.amount) }}</span>
        <span class="chip" :class="TONES[refund.status]">{{ $t(`finance.refunds.statuses.${refund.status}`) }}</span>
      </div>
    </header>

    <form v-if="refund.status === 'to_make' && !isReadOnly" class="flex flex-col gap-3" @submit.prevent="handleMake">
      <div class="grid grid-cols-3 gap-2">
        <button v-for="option in METHODS" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': method === option }" @click="method = option">
          {{ $t(`finance.methods.${option}`) }}
        </button>
      </div>
      <ui-field v-slot="{ id }" :label="$t('finance.detail.reference')">
        <input :id="id" v-model="reference" class="input" type="text" />
      </ui-field>
      <document-list :documents="documents" :empty-message="$t('finance.documents.none')" can-add @add="handleAddFiles" />
      <button type="submit" class="btn-primary" :disabled="!method || !isOnline || financeStore.isSaving">{{ $t('finance.refunds.make') }}</button>
    </form>

    <template v-else-if="refund.status === 'made'">
      <p class="body-two">{{ $t('finance.refunds.madeBy', { name: refund.madeBy ?? '', method: refund.method ? $t(`finance.methods.${refund.method}`) : '', reference: refund.reference ?? '—' }) }}</p>
      <document-list v-if="refund.documents.length" :documents="refund.documents" empty-message="" />
      <p v-if="refund.madeBy === sessionStore.fullName" class="body-two rounded-card bg-surface/70 p-3 text-center shadow-hairline">{{ $t('finance.refunds.ownRecord') }}</p>
      <button v-else-if="!isReadOnly" type="button" class="btn-primary" :disabled="!isOnline || financeStore.isSaving" @click="handleConfirm">{{ $t('finance.refunds.confirm') }}</button>
    </template>

    <p v-else-if="refund.status === 'confirmed'" class="body-two">{{ $t('finance.refunds.confirmedBy', { name: refund.confirmedBy ?? '', date: formatFullDate(refund.confirmedAt ?? refund.createdAt) }) }}</p>
  </article>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { readDocuments } from 'finance/composables/read-documents';
import { formatFullDate } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import type { IPaymentDocument, IRefund, PaymentMethodKey, RefundStatus } from 'finance/types/finance';

import UiField from 'global/components/ui-field.vue';
import DocumentList from 'finance/components/document-list.vue';

// props
const props = defineProps<{ refund: IRefund; isReadOnly: boolean; isOnline: boolean }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const METHODS: PaymentMethodKey[] = ['cash', 'cheque', 'transfer'];
const TONES: Record<RefundStatus, string> = { to_make: 'bg-warning-subtle text-fg-warning', made: 'bg-info-subtle text-fg-info', confirmed: 'bg-success-subtle text-fg-success' };
const method = ref<PaymentMethodKey | null>(null);
const reference = ref('');
const documents = ref<IPaymentDocument[]>([]);

// event handlers
const handleAddFiles = async (files: File[]): Promise<void> => {
  documents.value = [...documents.value, ...(await readDocuments(files, sessionStore.fullName))];
};

const handleMake = async (): Promise<void> => {
  if (!method.value) return;
  const updated = await financeStore.makeRefund(props.refund, { method: method.value, reference: reference.value.trim() || undefined, documents: documents.value });
  toastStore.push(t(updated ? 'finance.refunds.made' : 'finance.toasts.error'), updated ? 'success' : 'danger');
};

const handleConfirm = async (): Promise<void> => {
  const updated = await financeStore.confirmRefund(props.refund);
  toastStore.push(t(updated ? 'finance.refunds.confirmed' : 'finance.toasts.error'), updated ? 'success' : 'danger');
};
</script>
