<template>
  <div class="relative">
    <button type="button" class="btn-secondary" :aria-expanded="isOpen" @click="isOpen = !isOpen">{{ $t('expense.actions.export') }}</button>
    <div v-if="isOpen" class="card absolute inset-e-0 top-full z-20 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 p-4" @keydown.esc="isOpen = false">
      <ui-field v-slot="{ id }" :label="$t('expense.export.range')">
        <ui-select :id="id" v-model="rangeKey" :options="rangeOptionsComputed" :label="$t('expense.export.range')" />
      </ui-field>
      <p class="body-three">{{ $t('expense.export.hint') }}</p>
      <button type="button" class="btn-primary" :disabled="expenseStore.isExporting" @click="handleDownload">{{ $t('expense.export.download') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { buildExpenseCsv, exportMonths } from 'expense/composables/expense-export';
import { downloadText } from 'global/composables/download';
import { todayIso } from 'global/composables/date';
import { periodRange } from 'global/composables/use-period';
import { PREVIOUS_SEASON } from 'global/constants/period';
import type { IPeriod, IPeriodRange } from 'global/types/period';
import type { ISelectOption } from 'global/types/select';

import UiField from 'global/components/ui-field.vue';
import UiSelect from 'global/components/ui-select.vue';

// props
const props = defineProps<{ period: IPeriod }>();

// stores
const { t, locale } = useI18n();
const expenseStore = useExpenseStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();

// variables
const isOpen = ref(false);
const rangeKey = ref<string | null>('shown');
const EXPORT_LOCALE = 'fr';

// computed
const monthsComputed = computed((): IPeriodRange[] => exportMonths(PREVIOUS_SEASON.from, todayIso()));
const rangeOptionsComputed = computed((): ISelectOption[] => [
  { value: 'shown', label: t('expense.export.shown', { period: props.period.label }) },
  ...monthsComputed.value.map((month) => ({ value: month.from, label: formatMonth(month.from) })),
]);
const rangeComputed = computed((): IPeriodRange => monthsComputed.value.find((month) => month.from === rangeKey.value) ?? periodRange(props.period.key));

// methods
const formatMonth = (isoDate: string): string => new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(`${isoDate}T12:00:00Z`));

/** The accountant works in French, whatever language the screen is in. */
const exportLabel = (key: string): string => t(`expense.${key}`, {}, { locale: EXPORT_LOCALE });

// event handlers
const handleDownload = async (): Promise<void> => {
  const siteId = siteStore.currentSiteId;
  if (!siteId) return;
  const range = rangeComputed.value;
  const expenses = await expenseStore.fetchForExport(siteId, range);
  if (!expenses) {
    toastStore.push(t('expense.errors.generic'), 'danger');
    return;
  }
  const siteNames = Object.fromEntries(siteStore.sites.map((site) => [site.id, site.name]));
  downloadText(`charges-${range.from}-${range.to}.csv`, buildExpenseCsv(expenses, expenseStore.categories, siteNames, exportLabel), 'text/csv;charset=utf-8');
  toastStore.push(t('expense.export.done', { count: expenses.length }, expenses.length), 'success');
  isOpen.value = false;
};
</script>
