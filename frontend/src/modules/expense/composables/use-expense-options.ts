import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { EXPENSE_FREQUENCIES, NO_VAT, VAT_RATES } from 'expense/constants/expense';
import type { ExpenseFrequency } from 'expense/types/expense';
import type { ISelectOption } from 'global/types/select';

const ONCE = 'once';

/** The choices an Expense's form and page share, in words. */
export const useExpenseOptions = () => {
  const { t } = useI18n();
  const expenseStore = useExpenseStore();

  const categoryOptionsComputed: ComputedRef<ISelectOption[]> = computed(() =>
    expenseStore.groups.flatMap((group) => group.subcategories.map((subcategory) => ({ value: subcategory.id, label: t(`expense.categories.${subcategory.id}`), group: t(`expense.categories.${group.category.id}`) }))),
  );
  const vatOptionsComputed = computed((): { key: string; label: string }[] => [...VAT_RATES.map((rate) => ({ key: String(rate), label: rate ? `${rate} %` : t('expense.form.exempt') })), { key: NO_VAT, label: t('expense.form.noVat') }]);
  const frequencyOptionsComputed = computed((): { key: string; label: string }[] => [{ key: ONCE, label: t('expense.frequency.once') }, ...EXPENSE_FREQUENCIES.map((frequency) => ({ key: frequency, label: t(`expense.frequency.${frequency}`) }))]);

  const vatKeyOf = (rate: number | null): string => (rate === null ? NO_VAT : String(rate));
  const vatRateOf = (key: string): number | null => (key === NO_VAT ? null : Number(key));
  const frequencyKeyOf = (frequency: ExpenseFrequency | null): string => frequency ?? ONCE;
  const frequencyOf = (key: string): ExpenseFrequency | null => (key === ONCE ? null : (key as ExpenseFrequency));

  return { categoryOptionsComputed, vatOptionsComputed, frequencyOptionsComputed, vatKeyOf, vatRateOf, frequencyKeyOf, frequencyOf };
};
