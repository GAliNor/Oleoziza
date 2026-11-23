<template>
  <section class="rounded-card bg-surface shadow-hairline">
    <div v-if="!isOpen" class="flex flex-wrap items-center justify-between gap-3 p-4">
      <p class="flex min-w-0 flex-col">
        <span class="font-medium" :class="isLateComputed ? 'text-fg-danger' : 'text-fg-display'">{{ dueLineComputed }}</span>
        <span class="body-two">{{ $t('expense.pay.notCounted') }}</span>
      </p>
      <button type="button" class="btn-primary min-h-11" @click="handleOpen">{{ $t('expense.pay.open') }}</button>
    </div>
    <form v-else :ref="setFormRoot" class="pay-form flex flex-col gap-4 p-4" novalidate @submit.prevent="handleSubmit">
      <h3 class="heading-four">{{ $t('expense.pay.title') }}</h3>
      <div class="grid gap-4 @2xl:grid-cols-2">
        <ui-field v-slot="{ id, describedBy, isInvalid }" name="amount" :label="$t('expense.form.amount')" :error="errorOf('amount')" :is-valid="isValid('amount')" @leave="touch('amount')">
          <input :id="id" v-model.number="payment.amount" class="input text-xl figure" type="number" inputmode="decimal" min="0" step="0.01" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
        </ui-field>
        <ui-field v-slot="{ id }" name="date" :label="$t('expense.form.date')" :error="errorOf('date')" :is-valid="isValid('date')" :hint="seasonLineComputed" @leave="touch('date')">
          <ui-date-picker :id="id" v-model="payment.date" :label="$t('expense.form.date')" :max="todayIso()" />
        </ui-field>
      </div>
      <div class="flex flex-col gap-2">
        <span class="label">{{ $t('expense.form.paidBy') }}</span>
        <div class="grid grid-cols-2 gap-2 @xl:grid-cols-4">
          <button v-for="option in EXPENSE_PAID_BY" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': payment.paidBy === option }" :aria-pressed="payment.paidBy === option" @click="payment.paidBy = option">{{ $t(`expense.paidBy.${option}`) }}</button>
        </div>
      </div>
      <ui-field v-if="payment.paidBy !== 'cash'" v-slot="{ id }" :label="$t('expense.form.paymentReference')" is-optional>
        <input :id="id" v-model="payment.paymentReference" class="input" type="text" :placeholder="$t('expense.form.paymentReferencePlaceholder')" />
      </ui-field>
      <p v-if="refusal" class="form-error" role="alert">{{ refusal }}</p>
      <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="expenseStore.isSaving" :submit-label="$t('expense.pay.submit')" @jump="jumpTo" @submit="handleSubmit">
        <template #actions>
          <button type="button" class="btn-secondary min-h-13" @click="isOpen = false">{{ $t('global.property.cancel') }}</button>
        </template>
      </ui-form-bar>
    </form>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { daysUntil } from 'expense/composables/expense-due';
import { expenseErrorMessage } from 'expense/composables/expense-error';
import { useExpenseScope } from 'expense/composables/use-expense-scope';
import { useExpenseSeason } from 'expense/composables/use-expense-season';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { formatFullDate, todayIso } from 'global/composables/date';
import { EXPENSE_PAID_BY } from 'expense/constants/expense';
import type { ExpensePaidBy, IExpense } from 'expense/types/expense';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';

// props
const props = defineProps<{ expense: IExpense }>();

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();
const toastStore = useToastStore();
const { scopeOf } = useExpenseScope();

// variables
const isOpen = ref(false);
const refusal = ref('');
const payment = reactive({ id: '', date: todayIso(), amount: null as number | null | '', paidBy: 'cash' as ExpensePaidBy, paymentReference: '' });
const { seasonLineComputed, dateProblemComputed } = useExpenseSeason(
  () => props.expense.siteId,
  () => payment.date || null,
);
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt, reset } = useFormFeedback(() => [
  { key: 'amount', label: t('expense.form.amount'), isMissing: !payment.amount, isFilled: true },
  { key: 'date', label: t('expense.form.date'), isMissing: !payment.date, error: dateProblemComputed.value, isFilled: true },
]);

// computed
const daysComputed = computed((): number => daysUntil(props.expense.dueOn ?? todayIso(), todayIso()));
const isLateComputed = computed((): boolean => daysComputed.value < 0);
const dueLineComputed = computed((): string => {
  const date = formatFullDate(`${props.expense.dueOn}T12:00:00`);
  return `${t('expense.pay.dueOn', { date })} · ${isLateComputed.value ? t('expense.due.lateBy', { count: -daysComputed.value }, -daysComputed.value) : t('expense.due.inDays', { count: daysComputed.value }, daysComputed.value)}`;
});

// methods
const save = async (): Promise<void> => {
  refusal.value = '';
  const { id, date, amount, paidBy, paymentReference } = payment;
  const paid = await expenseStore.pay(props.expense.id, { id, date, amount: Number(amount), paidBy, paymentReference: paidBy === 'cash' ? '' : paymentReference.trim() });
  if (!paid) {
    refusal.value = expenseErrorMessage(expenseStore.saveErrorCode);
    return;
  }
  toastStore.push(t('expense.pay.done', { code: paid.code ?? '', scope: scopeOf(paid) }), 'success');
};

// event handlers
const handleOpen = (): void => {
  Object.assign(payment, { id: createId(), date: todayIso(), amount: props.expense.amount, paidBy: 'cash', paymentReference: '' });
  refusal.value = '';
  reset();
  isOpen.value = true;
};

const handleSubmit = (): void => attempt(save);
</script>

<style scoped>
.pay-form {
  animation: pay-open 320ms var(--ease-premium);
}

@keyframes pay-open {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pay-form {
    animation: none;
  }
}
</style>
