<template>
  <app-layout>
    <section ref="pageTop" class="@container mx-auto flex w-full max-w-6xl min-w-0 scroll-mt-24 flex-col gap-4">
      <header :class="isPaneOpenComputed ? 'sr-only' : 'rise flex flex-col gap-3 @4xl:flex-row @4xl:items-end @4xl:justify-between'">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">{{ $t('expense.page.title') }}</h1>
          <p class="body-two">{{ $t('expense.page.subtitle', { scope: scopeName }) }}</p>
        </div>
        <ui-segmented v-if="!isPaneOpenComputed" :model-value="period.key" :options="periodOptions" :label="$t('global.period.label')" @update:model-value="selectPeriod" />
      </header>
      <p v-if="isReadOnly && !isPaneOpenComputed" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('expense.page.readOnly') }}</p>

      <ui-empty-state v-if="expenseStore.hasSummaryError" class="card" tone="danger" size="compact" :message="$t('expense.page.loadError')">
        <template #action>
          <button type="button" class="btn-secondary" @click="reload">{{ $t('expense.page.retry') }}</button>
        </template>
      </ui-empty-state>

      <ui-master-detail :is-open="isPaneOpenComputed" :back-label="backLabelComputed" @close="handleBack">
        <template #list>
          <expense-draft-banner v-if="savedDraft && canManage" :draft="savedDraft" @resume="handleResumeDraft" @discard="handleDiscardDraft" />
          <div v-if="!expenseStore.summary" class="grid grid-cols-1 gap-3 @xl:grid-cols-3">
            <div v-for="index in 3" :key="index" class="skeleton h-28 rounded-card" />
          </div>
          <expense-tiles v-else class="rise" :summary="expenseStore.summary" :period-label="period.label" />
          <div class="flex min-w-0 flex-col-reverse items-start gap-3 @2xl:flex-row @2xl:items-center">
            <ui-segmented :model-value="view" :options="viewOptionsComputed" :label="$t('expense.view.label')" @update:model-value="selectView" />
            <div class="ms-auto flex flex-wrap gap-2 whitespace-nowrap">
              <expense-export :period="period" />
              <button v-if="canManage" type="button" class="btn-primary" @click="handleNew">{{ $t('expense.actions.new') }}</button>
            </div>
          </div>
          <expense-by-type v-if="view === 'type'" :summary="expenseStore.summary" :focus-id="focusId" @select="openType" />
          <template v-else>
            <div class="flex min-w-0 flex-col gap-2 @xl:flex-row @xl:items-center">
              <input v-model="search" class="input min-w-0 @xl:flex-1 @4xl:max-w-sm" type="search" :placeholder="$t('expense.register.search')" />
              <expense-type-filter class="@xl:w-60 @xl:shrink-0" :model-value="categoryId" @update:model-value="selectCategory" />
            </div>
            <expense-type-total v-if="categoryId && expenseStore.summary" :summary="expenseStore.summary" :category-id="categoryId" :parent-id="focusId" @back="selectView('type')" />
            <expense-register :list="expenseStore.list" :categories="expenseStore.categories" :selected-id="lastOpenedId" @open="handleOpen" @page="selectPage" />
          </template>
        </template>
        <template v-if="isPaneOpenComputed" #detail>
          <expense-form
            v-if="form && siteStore.currentSiteId"
            :key="form.key"
            :site-id="siteStore.currentSiteId"
            :mode="form.mode"
            :source="form.source"
            :initial-draft="form.initialDraft"
            @close="handleBack"
            @saved="handleSaved"
          />
          <expense-detail v-else-if="openExpense" :key="openExpense.id" :expense="openExpense" :can-manage="canManage" @edit="handleEdit(openExpense)" @duplicate="handleDuplicate(openExpense)" />
          <div v-else class="skeleton h-80 rounded-card" />
        </template>
      </ui-master-detail>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useSiteStore } from 'site/stores/site';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { useExpensePage } from 'expense/composables/use-expense-page';
import { useSiteScope } from 'site/composables/use-site-scope';
import { clearExpenseDraft, readExpenseDraft, type IExpenseDraft } from 'expense/composables/expense-draft-storage';
import type { ExpenseFormMode } from 'expense/composables/expense-draft';
import type { ExpenseView, IExpense, IExpensePayload } from 'expense/types/expense';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import ExpenseByType from 'expense/components/expense-by-type.vue';
import ExpenseDetail from 'expense/components/expense-detail.vue';
import ExpenseDraftBanner from 'expense/components/expense-draft-banner.vue';
import ExpenseExport from 'expense/components/expense-export.vue';
import ExpenseForm from 'expense/components/expense-form.vue';
import ExpenseRegister from 'expense/components/expense-register.vue';
import ExpenseTiles from 'expense/components/expense-tiles.vue';
import ExpenseTypeFilter from 'expense/components/expense-type-filter.vue';
import ExpenseTypeTotal from 'expense/components/expense-type-total.vue';

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();
const siteStore = useSiteStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();
const { scopeName } = useSiteScope();
const { view, selectView, openType, focusId, period, periodOptions, selectPeriod, search, categoryId, selectCategory, selectPage, openId, openExpense, open, close, isReadOnly, canManage, reload } = useExpensePage();

// variables
const pageTop = ref<HTMLElement | null>(null);
const form = ref<{ key: number; mode: ExpenseFormMode; source: IExpense | null; initialDraft: IExpensePayload | null } | null>(null);
const savedDraft = ref<IExpenseDraft | null>(null);
const lastOpenedId = ref<string | null>(null);
let formKey = 0;

// computed
const isPaneOpenComputed = computed((): boolean => Boolean(form.value) || Boolean(openId.value));
const viewOptionsComputed = computed((): { key: ExpenseView; label: string }[] => [
  { key: 'type', label: t('expense.view.byType') },
  { key: 'list', label: t('expense.view.all') },
]);
const backLabelComputed = computed((): string => t(form.value?.source ? 'expense.form.backToExpense' : 'expense.register.back'));

// methods
const showTop = async (): Promise<void> => {
  await nextTick();
  pageTop.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
};

/** The form slides in over the list, or over the Expense it starts from, which comes back on « Retour ». */
const openForm = (mode: ExpenseFormMode, source: IExpense | null, initialDraft: IExpensePayload | null = null): void => {
  formKey += 1;
  form.value = { key: formKey, mode, source, initialDraft };
  showTop();
};

/** The unsaved Expense kept on this device for this person and Site, if any. */
const readDraft = (): void => {
  const userId = sessionStore.session?.userId;
  const siteId = siteStore.currentSiteId;
  savedDraft.value = userId && siteId ? readExpenseDraft(userId, siteId) : null;
};

/** A draft started from an Expense needs that Expense again, even if it is on no page shown. */
const resumeDraft = async (draft: IExpenseDraft): Promise<void> => {
  let source: IExpense | null = null;
  if (draft.sourceId) {
    source = expenseStore.list.items.find((expense) => expense.id === draft.sourceId) ?? null;
    if (!source) {
      await expenseStore.fetchOne(draft.sourceId);
      source = expenseStore.current?.id === draft.sourceId ? expenseStore.current : null;
    }
  }
  openForm(source || draft.mode === 'new' ? draft.mode : 'new', source, draft.payload);
};

// watchers
watch(() => siteStore.currentSiteId, readDraft, { immediate: true });
watch(form, (current) => {
  if (!current) readDraft();
});

// event handlers
const handleNew = (): void => {
  if (savedDraft.value?.mode === 'new') resumeDraft(savedDraft.value);
  else openForm('new', null);
};

const handleResumeDraft = (): void => {
  if (savedDraft.value) resumeDraft(savedDraft.value);
};

const handleDiscardDraft = (): void => {
  const userId = sessionStore.session?.userId;
  if (userId && siteStore.currentSiteId) clearExpenseDraft(userId, siteStore.currentSiteId);
  savedDraft.value = null;
  toastStore.push(t('expense.draft.discarded'), 'success');
};

const handleEdit = (expense: IExpense): void => openForm('edit', expense);

const handleDuplicate = (expense: IExpense): void => openForm('duplicate', expense);

const handleOpen = (id: string): void => {
  lastOpenedId.value = id;
  open(id);
  showTop();
};

const handleBack = (): void => {
  if (form.value) {
    form.value = null;
    return;
  }
  close();
};

const handleSaved = (expense: IExpense): void => {
  form.value = null;
  lastOpenedId.value = expense.id;
  open(expense.id);
};
</script>
