<template>
  <div class="grid items-start gap-4 @4xl:grid-cols-2">
    <div class="flex min-w-0 flex-col gap-4">
      <ui-section :title="$t('expense.sections.payment')" :icon="CoinsLineIcon" tone="gold">
        <ui-property-list>
          <ui-property :label="$t('expense.form.amount')" :icon="CoinsLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="expense.amount === null" :empty-label="$t('expense.due.unknownAmount')" :is-optional="!isPaidComputed" :problem="amountProblemComputed" :save="save" @start="start">
            <span class="tabular-nums">{{ expense.amount === null ? '' : formatMoney(expense.amount) }}</span>
            <template #editor><input v-model.number="amountComputed" class="input min-h-11 tabular-nums" type="number" inputmode="decimal" min="0" step="0.01" /></template>
          </ui-property>
          <ui-property :label="$t('expense.form.vatRate')" :icon="PercentLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :save="save" @start="start">
            {{ vatLabelComputed }}
            <template #editor="{ submit }"><ui-segmented :model-value="vatKeyOf(draft.vatRate)" :options="vatOptionsComputed" :label="$t('expense.form.vatRate')" is-choice @update:model-value="(key: string) => ((draft.vatRate = vatRateOf(key)), submit())" /></template>
          </ui-property>
          <template v-if="isPaidComputed">
            <ui-property :label="$t('expense.form.date')" :icon="CalendarLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :hint="seasonLineComputed" :problem="dateProblemComputed" :save="save" @start="start">
              {{ dayLabel(expense.date) }}
              <template #editor="{ submit }"><ui-date-picker v-model="dateComputed" :label="$t('expense.form.date')" :max="todayIso()" @update:model-value="submit" /></template>
            </ui-property>
            <ui-property :label="$t('expense.form.paidBy')" :icon="WalletLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :save="save" @start="start">
              {{ expense.paidBy ? $t(`expense.paidBy.${expense.paidBy}`) : '' }}
              <template #editor="{ submit }"><ui-segmented :model-value="draft.paidBy ?? 'cash'" :options="paidByOptionsComputed" :label="$t('expense.form.paidBy')" is-choice @update:model-value="(key: ExpensePaidBy) => ((draft.paidBy = key), submit())" /></template>
            </ui-property>
            <ui-property v-if="expense.paidBy !== 'cash'" :label="$t('expense.form.paymentReference')" :icon="ReceiptLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="!expense.paymentReference" :save="save" is-optional @start="start">
              {{ expense.paymentReference }}
              <template #editor><input v-model="draft.paymentReference" class="input min-h-11" type="text" :placeholder="$t('expense.form.paymentReferencePlaceholder')" /></template>
            </ui-property>
          </template>
          <ui-property v-else :label="$t('expense.form.dueOn')" :icon="CalendarLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :problem="draft.dueOn ? null : $t('global.form.required')" :save="save" @start="start">
            {{ dayLabel(expense.dueOn) }}
            <template #editor="{ submit }"><ui-date-picker v-model="dueOnComputed" :label="$t('expense.form.dueOn')" @update:model-value="submit" /></template>
          </ui-property>
        </ui-property-list>
      </ui-section>
      <ui-section :title="$t('expense.sections.charge')" :icon="TagLineIcon" tone="olive">
        <ui-property-list>
          <ui-property :label="$t('expense.form.category')" :icon="TagLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :problem="draft.categoryId ? null : $t('global.form.required')" :save="save" @start="start">
            {{ categoryLineComputed }}
            <template #editor="{ submit }"><ui-select v-model="categoryIdComputed" :options="categoryOptionsComputed" :label="$t('expense.form.category')" is-searchable @update:model-value="submit" /></template>
          </ui-property>
          <ui-property :label="$t('expense.form.description')" :icon="PencilLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="!expense.description" :save="save" is-optional @start="start">
            {{ expense.description }}
            <template #editor><input v-model="draft.description" class="input min-h-11" type="text" :placeholder="$t('expense.form.descriptionPlaceholder')" /></template>
          </ui-property>
          <ui-property :label="$t('expense.form.frequency')" :icon="RepeatLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :hint="$t('expense.form.frequencyHint')" :save="save" @start="start">
            {{ $t(`expense.frequency.${expense.frequency ?? 'once'}`) }}
            <template #editor="{ submit }"><ui-segmented :model-value="frequencyKeyOf(draft.frequency)" :options="frequencyChoicesComputed" :label="$t('expense.form.frequency')" is-choice @update:model-value="(key: string) => ((draft.frequency = frequencyOf(key)), submit())" /></template>
          </ui-property>
          <ui-property v-if="accountCodeComputed" :label="$t('expense.detail.accountLabel')" :icon="DocumentLineIcon">
            <span class="tabular-nums">{{ accountCodeComputed }}</span>
          </ui-property>
        </ui-property-list>
      </ui-section>
    </div>
    <div class="flex min-w-0 flex-col gap-4">
      <ui-section :title="$t('expense.sections.supplier')" :icon="UserLineIcon" tone="terracotta">
        <ui-property-list>
          <ui-property :label="$t('expense.form.supplier')" :icon="UserLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="!expense.supplier" :save="save" is-optional is-explicit @start="start">
            {{ expense.supplier }}
            <template #editor><expense-supplier-field v-model="draft.supplierId" @select="handleSupplierPicked" @clear="handleSupplierCleared" /></template>
          </ui-property>
          <ui-property :label="$t('expense.form.ice')" :icon="IdCardLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="!expense.supplierIce" :hint="$t('expense.form.iceHint')" :problem="draft.supplierIce && !ICE_PATTERN.test(draft.supplierIce) ? $t('expense.form.iceInvalid') : null" :save="save" is-optional @start="start">
            <span class="tabular-nums">{{ expense.supplierIce }}</span>
            <template #editor><input v-model="draft.supplierIce" class="input min-h-11 tabular-nums" type="text" inputmode="numeric" maxlength="15" /></template>
          </ui-property>
          <ui-property :label="$t('expense.form.if')" :icon="IdCardLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="!expense.supplierIf" :save="save" is-optional @start="start">
            <span class="tabular-nums">{{ expense.supplierIf }}</span>
            <template #editor><input v-model="draft.supplierIf" class="input min-h-11 tabular-nums" type="text" inputmode="numeric" /></template>
          </ui-property>
        </ui-property-list>
      </ui-section>
      <ui-section :title="$t('expense.sections.invoice')" :icon="DocumentLineIcon" tone="blue">
        <ui-property-list>
          <ui-property :label="$t('expense.form.invoiceNumber')" :icon="DocumentLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="!expense.invoiceNumber" :save="save" is-optional @start="start">
            {{ expense.invoiceNumber }}
            <template #editor><input v-model="draft.invoiceNumber" class="input min-h-11" type="text" /></template>
          </ui-property>
          <ui-property :label="$t('expense.form.invoiceDate')" :icon="CalendarLineIcon" :is-locked="isLocked" :lock-reason="lockReason" :is-empty="!expense.invoiceDate" :save="save" is-optional @start="start">
            {{ dayLabel(expense.invoiceDate) }}
            <template #editor="{ submit }"><ui-date-picker v-model="invoiceDateComputed" :label="$t('expense.form.invoiceDate')" :max="todayIso()" is-clearable @update:model-value="submit" /></template>
          </ui-property>
        </ui-property-list>
        <div class="px-2 pt-2 pb-1">
          <slot name="documents" />
        </div>
      </ui-section>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { categoryIdOf } from 'expense/composables/expense-amounts';
import { ICE_PATTERN, payloadOf } from 'expense/composables/expense-draft';
import { expenseErrorMessage } from 'expense/composables/expense-error';
import { useExpenseOptions } from 'expense/composables/use-expense-options';
import { useExpenseSeason } from 'expense/composables/use-expense-season';
import { formatMoney } from 'global/composables/money';
import { formatFullDate, todayIso } from 'global/composables/date';
import { EXPENSE_PAID_BY } from 'expense/constants/expense';
import type { ExpensePaidBy, IExpense, ISupplier } from 'expense/types/expense';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import UiProperty from 'global/components/ui-property.vue';
import UiPropertyList from 'global/components/ui-property-list.vue';
import UiSection from 'global/components/ui-section.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UiSelect from 'global/components/ui-select.vue';
import ExpenseSupplierField from 'expense/components/expense-supplier-field.vue';
import CalendarLineIcon from 'global/icons/calendar-line.icon.vue';
import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import DocumentLineIcon from 'global/icons/document-line.icon.vue';
import IdCardLineIcon from 'global/icons/id-card-line.icon.vue';
import PencilLineIcon from 'global/icons/pencil-line.icon.vue';
import PercentLineIcon from 'global/icons/percent-line.icon.vue';
import ReceiptLineIcon from 'global/icons/receipt-line.icon.vue';
import RepeatLineIcon from 'global/icons/repeat-line.icon.vue';
import TagLineIcon from 'global/icons/tag-line.icon.vue';
import UserLineIcon from 'global/icons/user-line.icon.vue';
import WalletLineIcon from 'global/icons/wallet-line.icon.vue';

// props
const props = defineProps<{ expense: IExpense; isLocked: boolean; lockReason?: string }>();

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();
const { categoryOptionsComputed, vatOptionsComputed, frequencyOptionsComputed, vatKeyOf, vatRateOf, frequencyKeyOf, frequencyOf } = useExpenseOptions();

// variables
const draft = reactive(payloadOf(props.expense));
const { seasonLineComputed, dateProblemComputed } = useExpenseSeason(
  () => draft.siteId,
  () => draft.date,
);

// computed
const isPaidComputed = computed((): boolean => props.expense.paymentState === 'paid');
const categoryLineComputed = computed((): string => `${t(`expense.categories.${categoryIdOf(expenseStore.categories, props.expense.categoryId)}`)} › ${t(`expense.categories.${props.expense.categoryId}`)}`);
const vatLabelComputed = computed((): string => vatOptionsComputed.value.find((option) => option.key === vatKeyOf(props.expense.vatRate))?.label ?? '');
const paidByOptionsComputed = computed((): { key: ExpensePaidBy; label: string }[] => EXPENSE_PAID_BY.map((key) => ({ key, label: t(`expense.paidBy.${key}`) })));
/** A recurrence ends through « Arrêter la récurrence », which says what happens to the next ones. */
const frequencyChoicesComputed = computed(() => (props.expense.frequency ? frequencyOptionsComputed.value.slice(1) : frequencyOptionsComputed.value));
const amountProblemComputed = computed((): string | null => (isPaidComputed.value && !draft.amount ? t('global.form.required') : null));
const accountCodeComputed = computed((): string => expenseStore.categories.find((item) => item.id === props.expense.categoryId)?.accountCode ?? '');
const categoryIdComputed = computed({ get: (): string | null => draft.categoryId || null, set: (value: string | null) => (draft.categoryId = value ?? '') });
const dateComputed = computed({ get: (): string => draft.date ?? '', set: (value: string) => (draft.date = value || null) });
const dueOnComputed = computed({ get: (): string => draft.dueOn ?? '', set: (value: string) => (draft.dueOn = value || null) });
const invoiceDateComputed = computed({ get: (): string => draft.invoiceDate ?? '', set: (value: string) => (draft.invoiceDate = value || null) });
const amountComputed = computed({ get: (): number | null => draft.amount, set: (value: number | string | null) => (draft.amount = typeof value === 'number' && value > 0 ? value : null) });

// methods
const dayLabel = (day: string | null): string => (day ? formatFullDate(`${day}T12:00:00`) : '');

const start = (): void => {
  Object.assign(draft, payloadOf(props.expense));
};

const save = async (): Promise<true | string> => {
  const saved = await expenseStore.update(props.expense.id, { ...draft, documents: payloadOf(props.expense).documents, description: draft.description.trim() });
  return saved ? true : expenseErrorMessage(expenseStore.saveErrorCode);
};

// event handlers
const handleSupplierPicked = (supplier: ISupplier): void => {
  draft.supplier = supplier.name;
  if (supplier.ice) draft.supplierIce = supplier.ice;
  if (supplier.taxId) draft.supplierIf = supplier.taxId;
};

const handleSupplierCleared = (): void => {
  Object.assign(draft, { supplier: '', supplierIce: '', supplierIf: '' });
};
</script>
