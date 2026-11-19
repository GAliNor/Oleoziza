<template>
  <form class="card flex flex-col gap-5" @submit.prevent="handleSave">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="heading-three">{{ titleComputed }}</h2>
      <p v-if="savedAt" class="flex items-center gap-1.5 body-three" role="status">
        <check-line-icon class="h-3.5 w-3.5 text-fg-brand" />
        {{ $t('expense.draft.savedAt', { time: formatTime(savedAt) }) }}
      </p>
    </header>
    <p v-if="hasDroppedDocuments" class="body-two rounded-card bg-warning-subtle px-4 py-3 text-fg-warning">{{ $t('expense.draft.documentsNotKept') }}</p>

    <div class="grid gap-4 @2xl:grid-cols-2">
      <ui-field v-slot="{ id }" :label="$t('expense.form.date')">
        <ui-date-picker :id="id" v-model="draft.date" :label="$t('expense.form.date')" :min="SEASON_START" :max="todayIso()" required />
      </ui-field>
      <ui-field v-slot="{ id }" :label="$t('expense.form.category')">
        <ui-select :id="id" v-model="categoryIdComputed" :options="categoryOptionsComputed" :label="$t('expense.form.category')" :placeholder="$t('expense.form.categoryPlaceholder')" is-searchable />
      </ui-field>
    </div>

    <ui-field v-slot="{ id }" :label="$t('expense.form.description')">
      <input :id="id" v-model="draft.description" class="input" type="text" :placeholder="$t('expense.form.descriptionPlaceholder')" required />
      <p v-if="isInvestmentComputed" class="body-three">{{ $t('expense.form.investmentHint') }}</p>
    </ui-field>

    <div class="grid gap-4 @2xl:grid-cols-2">
      <ui-field v-slot="{ id }" :label="$t('expense.form.amount')">
        <div class="relative">
          <input :id="id" v-model.number="draft.amount" class="input pe-14 text-xl figure" type="number" inputmode="decimal" min="0" step="0.01" required />
          <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('global.units.dirham') }}</span>
        </div>
      </ui-field>
      <div class="flex flex-col gap-2">
        <span class="label">{{ $t('expense.form.vatRate') }}</span>
        <ui-segmented v-model="vatKeyComputed" :options="vatOptionsComputed" :label="$t('expense.form.vatRate')" is-choice is-full />
        <p class="body-three">{{ vatLineComputed }}</p>
      </div>
    </div>

    <ui-field v-slot="{ id }" :label="$t('expense.form.supplier')">
      <expense-supplier-field :id="id" v-model="draft.supplierId" @select="handleSupplierPicked" />
    </ui-field>

    <section class="flex flex-col gap-2">
      <h3 class="label">{{ $t('expense.form.paidBy') }}</h3>
      <div class="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        <button v-for="option in EXPENSE_PAID_BY" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': draft.paidBy === option }" @click="draft.paidBy = option">
          {{ $t(`expense.paidBy.${option}`) }}
        </button>
      </div>
    </section>

    <ui-disclosure v-model:is-open="isInvoiceOpen" :title="$t('expense.form.invoiceSection')">
      <div class="grid gap-4 @2xl:grid-cols-2">
        <ui-field v-slot="{ id }" :label="$t('expense.form.invoiceNumber')">
          <input :id="id" v-model="draft.invoiceNumber" class="input" type="text" />
        </ui-field>
        <ui-field v-slot="{ id }" :label="$t('expense.form.invoiceDate')">
          <ui-date-picker :id="id" v-model="invoiceDateComputed" :label="$t('expense.form.invoiceDate')" :max="todayIso()" is-clearable />
        </ui-field>
        <ui-field v-slot="{ id }" :label="$t('expense.form.ice')">
          <input :id="id" v-model="draft.supplierIce" class="input tabular-nums" type="text" inputmode="numeric" maxlength="15" :placeholder="$t('expense.form.iceHint')" />
        </ui-field>
        <ui-field v-slot="{ id }" :label="$t('expense.form.if')">
          <input :id="id" v-model="draft.supplierIf" class="input tabular-nums" type="text" inputmode="numeric" />
        </ui-field>
        <ui-field v-if="draft.paidBy !== 'cash'" v-slot="{ id }" class="@2xl:col-span-2" :label="$t('expense.form.paymentReference')">
          <input :id="id" v-model="draft.paymentReference" class="input" type="text" :placeholder="$t('expense.form.paymentReferencePlaceholder')" />
        </ui-field>
      </div>
    </ui-disclosure>

    <section class="flex flex-col gap-2">
      <h3 class="label">{{ $t('expense.form.documents') }}</h3>
      <expense-documents :documents="draft.documents" :is-reading="isReading" @add="handleAddFiles" @remove="handleRemoveDocument" />
    </section>

    <expense-warning-list :warnings="warningsComputed" />
    <p v-if="problem" class="body-two text-fg-danger" role="alert">{{ $t(`expense.form.${problem}`) }}</p>

    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('expense.form.close') }}</button>
      <button type="submit" class="btn-primary" :disabled="expenseStore.isSaving || isReading">{{ $t(mode === 'edit' ? 'expense.form.saveEdit' : 'expense.form.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, reactive, ref, toRaw } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { amountExclVat, categoryIdOf, vatOf } from 'expense/composables/expense-amounts';
import { draftFrom, draftProblem, type ExpenseFormMode } from 'expense/composables/expense-draft';
import { expenseWarnings } from 'expense/composables/expense-warnings';
import { readExpenseFiles } from 'expense/composables/read-expense-files';
import { useExpenseAutosave } from 'expense/composables/use-expense-autosave';
import { formatMoney } from 'global/composables/money';
import { formatTime, todayIso } from 'global/composables/date';
import { EXPENSE_PAID_BY, VAT_RATES } from 'expense/constants/expense';
import { INVESTMENT_CATEGORY_ID } from 'expense/constants/expense-categories';
import { SEASON_START } from 'global/constants/period';
import type { IExpense, IExpensePayload, ISupplier } from 'expense/types/expense';
import type { ISelectOption } from 'global/types/select';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import UiDisclosure from 'global/components/ui-disclosure.vue';
import UiField from 'global/components/ui-field.vue';
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

// variables
const draft = reactive(props.initialDraft ? structuredClone(toRaw(props.initialDraft)) : draftFrom(props.siteId, props.mode, props.source));
const problem = ref<'required' | 'iceInvalid' | null>(null);
const isReading = ref(false);
const isInvoiceOpen = ref(Boolean(draft.invoiceNumber || draft.supplierIce || draft.vatRate));
const NO_VAT = 'none';
const { savedAt, hasDroppedDocuments, discard } = useExpenseAutosave(draft, props.mode, props.source?.id ?? null);

// computed
const titleComputed = computed((): string => (props.mode === 'new' ? t('expense.form.titleNew') : t(props.mode === 'edit' ? 'expense.form.titleEdit' : 'expense.form.titleDuplicate', { code: props.source?.code ?? '' })));
const categoryOptionsComputed = computed((): ISelectOption[] =>
  expenseStore.groups.flatMap((group) => group.subcategories.map((subcategory) => ({ value: subcategory.id, label: t(`expense.categories.${subcategory.id}`), group: t(`expense.categories.${group.category.id}`) }))),
);
const categoryIdComputed = computed({
  get: (): string | null => draft.categoryId || null,
  set: (value: string | null): void => {
    draft.categoryId = value ?? '';
  },
});
const vatOptionsComputed = computed(() => [
  ...VAT_RATES.map((rate) => ({ key: String(rate), label: rate ? `${rate} %` : t('expense.form.exempt') })),
  { key: NO_VAT, label: t('expense.form.noVat') },
]);
const vatKeyComputed = computed({
  get: (): string => (draft.vatRate === null ? NO_VAT : String(draft.vatRate)),
  set: (key: string): void => {
    draft.vatRate = key === NO_VAT ? null : Number(key);
  },
});
const vatLineComputed = computed((): string =>
  draft.vatRate ? t('expense.form.vatSplit', { exclVat: formatMoney(amountExclVat(draft.amount || 0, draft.vatRate)), vat: formatMoney(vatOf(draft.amount || 0, draft.vatRate)) }) : t('expense.form.mixedRatesHint'),
);
const invoiceDateComputed = computed({
  get: (): string => draft.invoiceDate ?? '',
  set: (value: string): void => {
    draft.invoiceDate = value || null;
  },
});
const isInvestmentComputed = computed((): boolean => Boolean(draft.categoryId) && categoryIdOf(expenseStore.categories, draft.categoryId) === INVESTMENT_CATEGORY_ID);
const warningsComputed = computed(() => expenseWarnings(draft, expenseStore.categories));

// event handlers
const handleSupplierPicked = (supplier: ISupplier): void => {
  draft.supplier = supplier.name;
  if (supplier.ice) draft.supplierIce = supplier.ice;
  if (supplier.taxId) draft.supplierIf = supplier.taxId;
};

const handleAddFiles = async (files: File[]): Promise<void> => {
  isReading.value = true;
  try {
    draft.documents.push(...(await readExpenseFiles(files, sessionStore.fullName)));
  } catch {
    toastStore.push(t('global.photo.error'), 'danger');
  } finally {
    isReading.value = false;
  }
};

const handleRemoveDocument = (id: string): void => {
  draft.documents = draft.documents.filter((document) => document.id !== id);
};

const handleSave = async (): Promise<void> => {
  problem.value = draftProblem(draft);
  if (problem.value) return;
  const payload = { ...draft, description: draft.description.trim(), supplier: draft.supplier.trim() };
  const saved = props.mode === 'edit' ? await expenseStore.update(draft.id, payload) : await expenseStore.create(payload);
  if (!saved) {
    toastStore.push(t('expense.errors.generic'), 'danger');
    return;
  }
  discard();
  toastStore.push(t(props.mode === 'edit' ? 'expense.form.updated' : 'expense.form.saved', { code: saved.code ?? '' }), 'success');
  emit('saved', saved);
};
</script>
