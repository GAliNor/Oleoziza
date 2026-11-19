<template>
  <div class="stagger grid gap-5 rounded-card bg-subtle p-3 shadow-hairline @xl:p-6 @4xl:grid-cols-[minmax(0,1fr)_24rem] @4xl:gap-x-8">
    <div class="flex min-w-0 flex-col gap-5">
      <header class="flex flex-col gap-1">
        <p class="eyebrow">{{ expense.code }} · {{ categoryLineComputed }}</p>
        <h2 class="heading-three" :class="{ 'line-through decoration-1 opacity-60': isCancelledComputed }">{{ expense.description }}</h2>
        <p class="text-display-xs figure" :class="isCancelledComputed ? 'text-fg-secondary-paragraph line-through' : 'text-fg-display'">{{ formatMoney(expense.amount) }}</p>
        <p class="body-two">{{ vatLineComputed }}</p>
      </header>

      <p v-if="isCancelledComputed" class="body-two rounded-card bg-danger-subtle p-4 text-fg-danger">
        {{ $t('expense.detail.cancelledBy', { name: expense.cancelledBy, at: formatDateTime(expense.cancelledAt ?? ''), reason: expense.cancelReason }) }}
      </p>
      <expense-warning-list v-else :warnings="warningsComputed" />

      <dl class="grid gap-x-6 gap-y-3 @xl:grid-cols-2">
        <div v-for="row in factsComputed" :key="row.label" class="flex min-w-0 flex-col">
          <dt class="body-three">{{ row.label }}</dt>
          <dd class="truncate text-fg-display" :class="{ 'tabular-nums': row.isNumber }">{{ row.value }}</dd>
        </div>
      </dl>

      <ul class="flex flex-col gap-1 body-three">
        <li>{{ $t('expense.detail.recordedBy', { name: expense.recordedBy, at: formatDateTime(expense.recordedAt) }) }}</li>
        <li v-if="expense.updatedBy">{{ $t('expense.detail.updatedBy', { name: expense.updatedBy, at: formatDateTime(expense.updatedAt ?? '') }) }}</li>
      </ul>
    </div>

    <div class="flex min-w-0 flex-col gap-5">
      <section class="flex flex-col gap-2">
        <h3 class="eyebrow">{{ $t('expense.detail.documents') }}</h3>
        <document-list :documents="expense.documents" :empty-message="$t('expense.detail.noDocuments')" />
      </section>

      <div v-if="canManage" class="flex flex-col gap-3">
        <p v-if="isClosedComputed" class="body-two rounded-card bg-surface/70 p-4 shadow-hairline">{{ $t('expense.actions.closed') }}</p>
        <div class="flex flex-wrap gap-2">
          <button v-if="!isCancelledComputed && !isClosedComputed" type="button" class="btn-secondary" @click="emit('edit')">{{ $t('expense.actions.edit') }}</button>
          <button type="button" class="btn-secondary" @click="emit('duplicate')">{{ $t('expense.actions.duplicate') }}</button>
        </div>
        <div v-if="!isCancelledComputed && !isClosedComputed" class="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-hairline">
          <ui-field v-slot="{ id }" :label="$t('expense.actions.cancelReason')">
            <input :id="id" v-model="reason" class="input" type="text" :placeholder="$t('expense.actions.cancelReasonPlaceholder')" />
          </ui-field>
          <ui-confirm-button class="self-end" :label="$t('expense.actions.cancel')" :confirm-label="$t('expense.actions.confirmCancel')" :is-disabled="!reason.trim() || expenseStore.isSaving" @confirm="handleCancel" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useToastStore } from 'global/stores/toast';
import { amountExclVat, categoryIdOf, vatOf } from 'expense/composables/expense-amounts';
import { expenseWarnings } from 'expense/composables/expense-warnings';
import { formatMoney } from 'global/composables/money';
import { formatDateTime, formatFullDate } from 'global/composables/date';
import { SEASON_START } from 'global/constants/period';
import type { IExpense } from 'expense/types/expense';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiField from 'global/components/ui-field.vue';
import DocumentList from 'finance/components/document-list.vue';
import ExpenseWarningList from 'expense/components/expense-warning-list.vue';

// props
const props = defineProps<{ expense: IExpense; canManage: boolean }>();

// emits
const emit = defineEmits<{ (event: 'edit'): void; (event: 'duplicate'): void }>();

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();
const toastStore = useToastStore();

// variables
const reason = ref('');

// computed
const isCancelledComputed = computed((): boolean => props.expense.status === 'cancelled');
const isClosedComputed = computed((): boolean => props.expense.date < SEASON_START);
const subcategoryComputed = computed(() => expenseStore.categories.find((item) => item.id === props.expense.categoryId));
const categoryLineComputed = computed((): string => `${t(`expense.categories.${categoryIdOf(expenseStore.categories, props.expense.categoryId)}`)} › ${t(`expense.categories.${props.expense.categoryId}`)}`);
const vatLineComputed = computed((): string => {
  const { amount, vatRate } = props.expense;
  if (vatRate === null) return t('expense.detail.noVat');
  if (vatRate === 0) return t('expense.detail.exempt');
  return `${t('expense.detail.exclVat')} ${formatMoney(amountExclVat(amount, vatRate))} · ${t('expense.detail.vat', { rate: vatRate })} ${formatMoney(vatOf(amount, vatRate))}`;
});
const warningsComputed = computed(() => expenseWarnings(props.expense, expenseStore.categories));
const factsComputed = computed(() =>
  [
    { label: t('expense.detail.date'), value: formatFullDate(`${props.expense.date}T12:00:00`) },
    { label: t('expense.detail.paidBy'), value: [t(`expense.paidBy.${props.expense.paidBy}`), props.expense.paymentReference].filter(Boolean).join(' · ') },
    { label: t('expense.detail.supplier'), value: props.expense.supplier },
    { label: t('expense.detail.invoice'), value: [props.expense.invoiceNumber, props.expense.invoiceDate ? formatFullDate(`${props.expense.invoiceDate}T12:00:00`) : ''].filter(Boolean).join(' · ') },
    { label: t('expense.detail.ice'), value: props.expense.supplierIce, isNumber: true },
    { label: t('expense.detail.if'), value: props.expense.supplierIf, isNumber: true },
    { label: t('expense.detail.accountLabel'), value: subcategoryComputed.value?.accountCode ?? '', isNumber: true },
  ].filter((row) => row.value),
);

// event handlers
const handleCancel = async (): Promise<void> => {
  const cancelled = await expenseStore.cancel(props.expense, reason.value.trim());
  toastStore.push(t(cancelled ? 'expense.actions.cancelled' : 'expense.errors.generic'), cancelled ? 'success' : 'danger');
};
</script>
