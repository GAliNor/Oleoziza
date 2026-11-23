<template>
  <form :ref="setFormRoot" class="card flex flex-col gap-5" novalidate @submit.prevent="handleSubmit">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="heading-three">{{ titleComputed }}</h2>
      <p v-if="savedAt" class="flex items-center gap-1.5 body-three" role="status">
        <check-line-icon class="h-3.5 w-3.5 text-fg-brand" />
        {{ $t('expense.draft.savedAt', { time: formatTime(savedAt) }) }}
      </p>
    </header>
    <p v-if="hasDroppedDocuments" class="body-two rounded-card bg-warning-subtle px-4 py-3 text-fg-warning">{{ $t('expense.draft.documentsNotKept') }}</p>

    <div class="grid grid-cols-2 gap-2" role="radiogroup" :aria-label="$t('expense.form.paymentState')">
      <button v-for="state in PAYMENT_STATES" :key="state" type="button" role="radio" class="toggle-tile py-2 text-start" :class="{ 'toggle-tile-active': draft.paymentState === state }" :aria-checked="draft.paymentState === state" @click="draft.paymentState = state">
        <span class="block">{{ $t(`expense.form.state.${state}`) }}</span>
        <span class="block text-xs font-normal opacity-80">{{ $t(`expense.form.stateHint.${state}`) }}</span>
      </button>
    </div>

    <div class="grid gap-4 @2xl:grid-cols-2">
      <ui-field v-slot="{ id, isInvalid }" name="category" :label="$t('expense.form.category')" :error="errorOf('category')" :is-valid="isValid('category')" @leave="touch('category')">
        <ui-select :id="id" v-model="categoryIdComputed" :options="categoryOptionsComputed" :label="$t('expense.form.category')" :placeholder="$t('expense.form.categoryPlaceholder')" :aria-invalid="isInvalid" is-searchable />
      </ui-field>
      <ui-field v-if="isPaidComputed" v-slot="{ id }" name="date" :label="$t('expense.form.date')" :error="errorOf('date')" :is-valid="isValid('date')" :hint="seasonLineComputed" @leave="touch('date')">
        <ui-date-picker :id="id" v-model="dateComputed" :label="$t('expense.form.date')" :max="todayIso()" />
      </ui-field>
      <ui-field v-else v-slot="{ id }" name="dueOn" :label="$t('expense.form.dueOn')" :error="errorOf('dueOn')" :is-valid="isValid('dueOn')" :hint="$t('expense.form.dueOnHint')" @leave="touch('dueOn')">
        <ui-date-picker :id="id" v-model="dueOnComputed" :label="$t('expense.form.dueOn')" />
      </ui-field>
    </div>

    <div class="grid gap-4 @2xl:grid-cols-2">
      <ui-field v-slot="{ id, describedBy, isInvalid }" name="amount" :label="$t('expense.form.amount')" :is-optional="!isPaidComputed" :error="errorOf('amount')" :is-valid="isValid('amount')" :hint="isPaidComputed ? undefined : $t('expense.form.amountLaterHint')" @leave="touch('amount')">
        <div class="relative">
          <input :id="id" v-model.number="amountComputed" class="input pe-14 text-xl figure" type="number" inputmode="decimal" min="0" step="0.01" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
          <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('global.units.dirham') }}</span>
        </div>
      </ui-field>
      <div class="flex flex-col gap-2">
        <span class="label">{{ $t('expense.form.vatRate') }}</span>
        <ui-segmented :model-value="vatKeyOf(draft.vatRate)" :options="vatOptionsComputed" :label="$t('expense.form.vatRate')" is-choice is-full @update:model-value="(key: string) => (draft.vatRate = vatRateOf(key))" />
        <p class="body-three">{{ vatLineComputed }}</p>
      </div>
    </div>

    <ui-field v-slot="{ id }" :label="$t('expense.form.supplier')" is-optional>
      <expense-supplier-field :id="id" v-model="draft.supplierId" @select="handleSupplierPicked" @clear="handleSupplierCleared" />
    </ui-field>

    <ui-field v-slot="{ id }" :label="$t('expense.form.description')" :hint="isInvestmentComputed ? $t('expense.form.investmentHint') : undefined" is-optional>
      <input :id="id" v-model="draft.description" class="input" type="text" :placeholder="$t('expense.form.descriptionPlaceholder')" />
    </ui-field>

    <section v-if="isPaidComputed" class="flex flex-col gap-2">
      <h3 class="label">{{ $t('expense.form.paidBy') }}</h3>
      <div class="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        <button v-for="option in EXPENSE_PAID_BY" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': draft.paidBy === option }" :aria-pressed="draft.paidBy === option" @click="draft.paidBy = option">
          {{ $t(`expense.paidBy.${option}`) }}
        </button>
      </div>
    </section>

    <div class="flex flex-col gap-2">
      <span class="label">{{ $t('expense.form.frequency') }}</span>
      <ui-segmented :model-value="frequencyKeyOf(draft.frequency)" :options="frequencyOptionsComputed" :label="$t('expense.form.frequency')" is-choice is-full @update:model-value="(key: string) => (draft.frequency = frequencyOf(key))" />
      <p v-if="nextDueComputed" class="body-three">{{ $t('expense.form.nextDue', { date: nextDueComputed }) }}</p>
    </div>

    <ui-disclosure v-model:is-open="isInvoiceOpen" :title="$t('expense.form.invoiceSection')">
      <div class="grid gap-4 @2xl:grid-cols-2">
        <ui-field v-slot="{ id }" :label="$t('expense.form.invoiceNumber')" is-optional>
          <input :id="id" v-model="draft.invoiceNumber" class="input" type="text" />
        </ui-field>
        <ui-field v-slot="{ id }" :label="$t('expense.form.invoiceDate')" is-optional>
          <ui-date-picker :id="id" v-model="invoiceDateComputed" :label="$t('expense.form.invoiceDate')" :max="todayIso()" is-clearable />
        </ui-field>
        <ui-field v-slot="{ id, describedBy, isInvalid }" name="ice" :label="$t('expense.form.ice')" :error="errorOf('ice')" :is-valid="isValid('ice')" is-optional @leave="touch('ice')">
          <input :id="id" v-model="draft.supplierIce" class="input tabular-nums" type="text" inputmode="numeric" maxlength="15" :placeholder="$t('expense.form.iceHint')" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
        </ui-field>
        <ui-field v-slot="{ id }" :label="$t('expense.form.if')" is-optional>
          <input :id="id" v-model="draft.supplierIf" class="input tabular-nums" type="text" inputmode="numeric" />
        </ui-field>
        <ui-field v-if="isPaidComputed && draft.paidBy !== 'cash'" v-slot="{ id }" class="@2xl:col-span-2" :label="$t('expense.form.paymentReference')" is-optional>
          <input :id="id" v-model="draft.paymentReference" class="input" type="text" :placeholder="$t('expense.form.paymentReferencePlaceholder')" />
        </ui-field>
      </div>
    </ui-disclosure>

    <section class="flex flex-col gap-2">
      <h3 class="flex items-center gap-2">
        <span class="label">{{ $t('expense.form.documents') }}</span>
        <span class="caption">{{ $t('global.form.optional') }}</span>
      </h3>
      <expense-documents :documents="draft.documents" :is-reading="isReading" @add="handleAddFiles" @remove="handleRemoveDocument" />
    </section>

    <expense-warning-list :warnings="warningsComputed" />
    <p v-if="refusal" class="form-error" role="alert">{{ refusal }}</p>

    <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="expenseStore.isSaving" :is-disabled="isReading" :submit-label="$t(isPaidComputed ? 'expense.form.save' : 'expense.form.saveToPay')" @jump="handleJump" @submit="handleSubmit">
      <template #actions>
        <button type="button" class="btn-secondary min-h-13" @click="emit('close')">{{ $t('expense.form.close') }}</button>
      </template>
    </ui-form-bar>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, reactive, ref, toRaw } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { amountExclVat, categoryIdOf, vatOf } from 'expense/composables/expense-amounts';
import { completeDraft, draftFrom, ICE_PATTERN, type ExpenseFormMode } from 'expense/composables/expense-draft';
import { nextDueOn } from 'expense/composables/expense-due';
import { expenseErrorMessage } from 'expense/composables/expense-error';
import { expenseTitle } from 'expense/composables/expense-title';
import { expenseWarnings } from 'expense/composables/expense-warnings';
import { readFiles } from 'global/composables/read-files';
import { useExpenseAutosave } from 'expense/composables/use-expense-autosave';
import { useExpenseOptions } from 'expense/composables/use-expense-options';
import { useExpenseScope } from 'expense/composables/use-expense-scope';
import { useExpenseSeason } from 'expense/composables/use-expense-season';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { formatMoney } from 'global/composables/money';
import { formatFullDate, formatTime, todayIso } from 'global/composables/date';
import { EXPENSE_PAID_BY } from 'expense/constants/expense';
import { INVESTMENT_CATEGORY_ID } from 'expense/constants/expense-categories';
import type { ExpensePaymentState, IExpense, IExpensePayload, ISupplier } from 'expense/types/expense';
import type { IFormRule } from 'global/types/form';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import UiDisclosure from 'global/components/ui-disclosure.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UiSelect from 'global/components/ui-select.vue';
import ExpenseDocuments from 'expense/components/expense-documents.vue';
import ExpenseSupplierField from 'expense/components/expense-supplier-field.vue';
import ExpenseWarningList from 'expense/components/expense-warning-list.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';

// props
const props = withDefaults(defineProps<{ siteId: string; mode?: ExpenseFormMode; source?: IExpense | null; initialDraft?: IExpensePayload | null }>(), { mode: 'new', source: null, initialDraft: null });

// emits
const emit = defineEmits<{ (event: 'close'): void; (event: 'saved', expense: IExpense): void }>();

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();
const { categoryOptionsComputed, vatOptionsComputed, frequencyOptionsComputed, vatKeyOf, vatRateOf, frequencyKeyOf, frequencyOf } = useExpenseOptions();
const { scopeOf } = useExpenseScope();

// variables
const PAYMENT_STATES: readonly ExpensePaymentState[] = ['paid', 'to_pay'];
const draft = reactive(props.initialDraft ? completeDraft(props.siteId, structuredClone(toRaw(props.initialDraft))) : draftFrom(props.siteId, props.mode, props.source));
const refusal = ref('');
const isReading = ref(false);
const isInvoiceOpen = ref(Boolean(draft.invoiceNumber || draft.supplierIce || draft.vatRate));
const { savedAt, hasDroppedDocuments, discard } = useExpenseAutosave(draft, props.mode, props.source?.id ?? null);
const { seasonLineComputed, dateProblemComputed } = useExpenseSeason(
  () => draft.siteId,
  () => draft.date,
);

// computed
const isPaidComputed = computed((): boolean => draft.paymentState === 'paid');
const titleComputed = computed((): string => (props.source ? t('expense.form.titleDuplicate', { title: expenseTitle(props.source) }) : t('expense.form.titleNew')));
const categoryIdComputed = computed({ get: (): string | null => draft.categoryId || null, set: (value: string | null) => (draft.categoryId = value ?? '') });
const dateComputed = computed({ get: (): string => draft.date ?? '', set: (value: string) => (draft.date = value || null) });
const dueOnComputed = computed({ get: (): string => draft.dueOn ?? '', set: (value: string) => (draft.dueOn = value || null) });
const invoiceDateComputed = computed({ get: (): string => draft.invoiceDate ?? '', set: (value: string) => (draft.invoiceDate = value || null) });
const amountComputed = computed({ get: (): number | null => draft.amount, set: (value: number | string | null) => (draft.amount = typeof value === 'number' ? value : null) });
const vatLineComputed = computed((): string =>
  draft.vatRate ? t('expense.form.vatSplit', { exclVat: formatMoney(amountExclVat(draft.amount ?? 0, draft.vatRate)), vat: formatMoney(vatOf(draft.amount ?? 0, draft.vatRate)) }) : t('expense.form.mixedRatesHint'),
);
const nextDueComputed = computed((): string => {
  const from = isPaidComputed.value ? draft.date : draft.dueOn;
  return draft.frequency && from ? formatFullDate(`${nextDueOn(from, draft.frequency)}T12:00:00`) : '';
});
const isInvestmentComputed = computed((): boolean => Boolean(draft.categoryId) && categoryIdOf(expenseStore.categories, draft.categoryId) === INVESTMENT_CATEGORY_ID);
const warningsComputed = computed(() => (isPaidComputed.value ? expenseWarnings(draft, expenseStore.categories) : []));
const rulesComputed = computed((): IFormRule[] => [
  { key: 'category', label: t('expense.form.category'), isMissing: !draft.categoryId, isFilled: true },
  ...(isPaidComputed.value
    ? [
        { key: 'date', label: t('expense.form.date'), isMissing: !draft.date, error: dateProblemComputed.value, isFilled: true },
        { key: 'amount', label: t('expense.form.amount'), isMissing: !draft.amount, isFilled: true },
      ]
    : [{ key: 'dueOn', label: t('expense.form.dueOn'), isMissing: !draft.dueOn, isFilled: true }]),
  { key: 'ice', label: t('expense.form.ice'), error: draft.supplierIce && !ICE_PATTERN.test(draft.supplierIce) ? t('expense.form.iceInvalid') : null, isFilled: !!draft.supplierIce },
]);
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt } = useFormFeedback(() => rulesComputed.value);

// methods
/** What was typed for the other state stays in the form, and is left out of what is sent. */
const toPayload = (): IExpensePayload => {
  const common = { ...draft, description: draft.description.trim(), supplier: draft.supplier.trim() };
  return isPaidComputed.value ? { ...common, dueOn: null } : { ...common, date: null, paidBy: null, paymentReference: '' };
};

const save = async (): Promise<void> => {
  refusal.value = '';
  const saved = await expenseStore.create(toPayload());
  if (!saved) {
    refusal.value = expenseErrorMessage(expenseStore.saveErrorCode);
    return;
  }
  discard();
  const isPaid = saved.paymentState === 'paid';
  toastStore.push(t(isPaid ? 'expense.form.saved' : 'expense.form.savedToPay', { code: saved.code ?? '', scope: scopeOf(saved), date: saved.dueOn ? formatFullDate(`${saved.dueOn}T12:00:00`) : '' }), 'success');
  emit('saved', saved);
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

const handleAddFiles = async (files: File[]): Promise<void> => {
  isReading.value = true;
  try {
    draft.documents.push(...(await readFiles(files, sessionStore.fullName)));
  } catch {
    toastStore.push(t('global.photo.error'), 'danger');
  } finally {
    isReading.value = false;
  }
};

const handleRemoveDocument = (id: string): void => {
  draft.documents = draft.documents.filter((document) => document.id !== id);
};

/** The ICE lives in a fold: it opens before the field is shown. */
const handleJump = async (key: string): Promise<void> => {
  if (key === 'ice') isInvoiceOpen.value = true;
  await nextTick();
  jumpTo(key);
};

const handleSubmit = (): void => {
  if (problemsComputed.value[0]?.key === 'ice') isInvoiceOpen.value = true;
  attempt(save);
};
</script>
