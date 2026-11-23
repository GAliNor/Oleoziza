<template>
  <article class="stagger @container flex w-full min-w-0 flex-col gap-5">
    <header class="flex flex-col gap-2">
      <p class="flex flex-wrap items-center gap-2">
        <span class="chip" :class="stateToneComputed">{{ stateLabelComputed }}</span>
        <span v-if="expense.code" class="eyebrow">{{ expense.code }}</span>
        <span v-if="expense.frequency" class="inline-flex items-center gap-1 body-three"><repeat-line-icon class="h-3.5 w-3.5" />{{ $t(`expense.frequency.${expense.frequency}`) }}</span>
      </p>
      <h2 class="heading-two" :class="{ 'line-through decoration-1 opacity-60': isCancelledComputed }">{{ expenseTitle(expense) }}</h2>
      <p class="text-display-xs figure" :class="isCancelledComputed ? 'text-fg-secondary-paragraph line-through' : expense.amount === null ? 'text-fg-muted' : 'text-fg-display'">{{ expense.amount === null ? $t('expense.due.unknownAmount') : formatMoney(expense.amount) }}</p>
      <p class="body-two">{{ subtitleComputed }}</p>
    </header>

    <p v-if="isCancelledComputed" class="body-two rounded-card bg-danger-subtle p-4 text-fg-danger">
      {{ $t('expense.detail.cancelledBy', { name: expense.cancelledBy, at: formatDateTime(expense.cancelledAt ?? ''), reason: expense.cancelReason }) }}
    </p>
    <expense-warning-list v-else-if="isPaidComputed" :warnings="warningsComputed" />
    <p v-if="expense.isLocked && !isCancelledComputed" class="flex items-center gap-2 body-two rounded-card bg-subtle p-4"><lock-line-icon class="h-4 w-4 shrink-0" />{{ $t('expense.actions.closed') }}</p>

    <expense-pay-panel v-if="canManage && !isPaidComputed && !isCancelledComputed" :expense="expense" />

    <expense-properties :expense="expense" :is-locked="isLockedComputed" :lock-reason="lockReasonComputed">
      <template #documents>
        <document-list v-if="isLockedComputed" :documents="expense.documents" :empty-message="$t('expense.detail.noDocuments')" />
        <expense-documents v-else :documents="expense.documents" :is-reading="isReading" @add="handleAddFiles" @remove="handleRemoveDocument" />
      </template>
    </expense-properties>

    <div v-if="canManage" class="flex flex-col gap-3 border-t border-default pt-4">
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-secondary" @click="emit('duplicate')">{{ $t('expense.actions.duplicate') }}</button>
        <ui-confirm-button v-if="canChangeComputed && isPaidComputed" :is-danger="false" :label="$t('expense.actions.unpay')" :confirm-label="$t('expense.actions.confirmUnpay')" :is-disabled="expenseStore.isSaving" @confirm="handleUnpay" />
        <ui-confirm-button v-if="canChangeComputed && expense.frequency" :label="$t('expense.actions.stopRecurrence')" :confirm-label="$t('expense.actions.confirmStopRecurrence')" :is-disabled="expenseStore.isSaving" @confirm="handleStopRecurrence" />
        <ui-confirm-button v-if="canChangeComputed && !isPaidComputed" :label="$t('expense.actions.delete')" :confirm-label="$t(expense.frequency ? 'expense.actions.confirmDeleteRecurring' : 'expense.actions.confirmDelete')" :is-disabled="expenseStore.isSaving" @confirm="handleDelete" />
      </div>
      <ui-reveal v-if="canChangeComputed && isPaidComputed" :label="$t('expense.actions.cancel')">
        <div class="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-hairline">
          <ui-field v-slot="{ id }" :label="$t('expense.actions.cancelReason')">
            <input :id="id" v-model="reason" class="input" type="text" :placeholder="$t('expense.actions.cancelReasonPlaceholder')" />
          </ui-field>
          <ui-confirm-button class="self-end" :label="$t('expense.actions.cancel')" :confirm-label="$t('expense.actions.confirmCancel')" :is-disabled="!reason.trim() || expenseStore.isSaving" @confirm="handleCancel" />
        </div>
      </ui-reveal>
    </div>

    <ul class="flex flex-col gap-1 body-three">
      <li>{{ expense.recordedBy ? $t('expense.detail.recordedBy', { name: expense.recordedBy, at: formatDateTime(expense.recordedAt) }) : $t('expense.detail.recordedByApp', { at: formatDateTime(expense.recordedAt) }) }}</li>
      <li v-if="expense.updatedBy">{{ $t('expense.detail.updatedBy', { name: expense.updatedBy, at: formatDateTime(expense.updatedAt ?? '') }) }}</li>
    </ul>
  </article>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { amountExclVat, vatOf } from 'expense/composables/expense-amounts';
import { payloadOf } from 'expense/composables/expense-draft';
import { expenseErrorMessage } from 'expense/composables/expense-error';
import { expenseTitle } from 'expense/composables/expense-title';
import { expenseWarnings } from 'expense/composables/expense-warnings';
import { createId } from 'global/composables/crypto';
import { readFiles } from 'global/composables/read-files';
import { formatMoney } from 'global/composables/money';
import { formatDateTime, todayIso } from 'global/composables/date';
import { useExpenseScope } from 'expense/composables/use-expense-scope';
import type { IExpense, IExpenseDocument } from 'expense/types/expense';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiField from 'global/components/ui-field.vue';
import UiReveal from 'global/components/ui-reveal.vue';
import DocumentList from 'finance/components/document-list.vue';
import ExpenseDocuments from 'expense/components/expense-documents.vue';
import ExpensePayPanel from 'expense/components/expense-pay-panel.vue';
import ExpenseProperties from 'expense/components/expense-properties.vue';
import ExpenseWarningList from 'expense/components/expense-warning-list.vue';
import LockLineIcon from 'global/icons/lock-line.icon.vue';
import RepeatLineIcon from 'global/icons/repeat-line.icon.vue';

// props
const props = defineProps<{ expense: IExpense; canManage: boolean }>();

// emits
const emit = defineEmits<{ (event: 'duplicate'): void; (event: 'deleted'): void }>();

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();
const { scopeOf } = useExpenseScope();

// variables
const reason = ref('');
const isReading = ref(false);

// computed
const isCancelledComputed = computed((): boolean => props.expense.status === 'cancelled');
const isPaidComputed = computed((): boolean => props.expense.paymentState === 'paid');
const isLateComputed = computed((): boolean => !isPaidComputed.value && (props.expense.dueOn ?? '') < todayIso());
const canChangeComputed = computed((): boolean => props.canManage && !isCancelledComputed.value && !props.expense.isLocked);
const isLockedComputed = computed((): boolean => !canChangeComputed.value);
const lockReasonComputed = computed((): string | undefined => (props.expense.isLocked ? t('expense.actions.closed') : undefined));
const stateLabelComputed = computed((): string => {
  if (isCancelledComputed.value) return t('expense.register.cancelled');
  if (isPaidComputed.value) return t('expense.state.paid');
  return t(isLateComputed.value ? 'expense.state.late' : 'expense.state.to_pay');
});
const stateToneComputed = computed((): string => {
  if (isCancelledComputed.value || isLateComputed.value) return 'bg-danger-subtle text-fg-danger';
  return isPaidComputed.value ? 'bg-selected text-fg-brand' : 'bg-warning-subtle text-fg-warning';
});
const vatLineComputed = computed((): string => {
  const { amount, vatRate } = props.expense;
  if (vatRate === null || amount === null) return '';
  if (vatRate === 0) return t('expense.detail.exempt');
  return `${t('expense.detail.exclVat')} ${formatMoney(amountExclVat(amount, vatRate))} · ${t('expense.detail.vat', { rate: vatRate })} ${formatMoney(vatOf(amount, vatRate))}`;
});
const subtitleComputed = computed((): string => [scopeOf(props.expense), vatLineComputed.value].filter(Boolean).join(' · '));
const warningsComputed = computed(() => expenseWarnings(props.expense, expenseStore.categories));

// methods
const refuse = (): void => {
  toastStore.push(expenseErrorMessage(expenseStore.saveErrorCode), 'danger');
};

const saveDocuments = async (documents: IExpenseDocument[]): Promise<void> => {
  if (!(await expenseStore.update(props.expense.id, payloadOf(props.expense, { documents })))) refuse();
};

// event handlers
const handleAddFiles = async (files: File[]): Promise<void> => {
  isReading.value = true;
  try {
    await saveDocuments([...props.expense.documents, ...(await readFiles(files, sessionStore.fullName))]);
  } catch {
    toastStore.push(t('global.photo.error'), 'danger');
  } finally {
    isReading.value = false;
  }
};

const handleRemoveDocument = (id: string): Promise<void> => saveDocuments(props.expense.documents.filter((document) => document.id !== id));

const handleUnpay = async (): Promise<void> => {
  if (await expenseStore.unpay(props.expense.id, createId())) toastStore.push(t('expense.actions.unpaid'), 'success');
  else refuse();
};

const handleStopRecurrence = async (): Promise<void> => {
  const { id } = props.expense;
  if (!(await expenseStore.stopRecurrence(id, createId()))) {
    refuse();
    return;
  }
  toastStore.push(t('expense.actions.recurrenceStopped'), 'success');
  if (expenseStore.current?.id !== id && !expenseStore.list.items.some((expense) => expense.id === id)) emit('deleted');
};

const handleDelete = async (): Promise<void> => {
  if (!(await expenseStore.delete(props.expense.id))) {
    refuse();
    return;
  }
  toastStore.push(t('expense.actions.deleted'), 'success');
  emit('deleted');
};

const handleCancel = async (): Promise<void> => {
  if (await expenseStore.cancel(props.expense, reason.value.trim())) toastStore.push(t('expense.actions.cancelled'), 'success');
  else refuse();
};
</script>
