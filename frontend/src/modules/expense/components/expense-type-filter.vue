<template>
  <ui-select v-model="selected" :options="optionsComputed" :label="$t('expense.register.type')" is-searchable />
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import type { ISelectOption } from 'global/types/select';

import UiSelect from 'global/components/ui-select.vue';

// emits
const model = defineModel<string | null>({ required: true });

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();

// variables
const ALL = 'all';

// computed
const optionsComputed = computed((): ISelectOption[] => [
  { value: ALL, label: t('expense.register.allTypes') },
  ...expenseStore.groups.flatMap((group) => {
    const category = t(`expense.categories.${group.category.id}`);
    return [
      { value: group.category.id, label: t('expense.register.wholeCategory', { category }), group: category },
      ...group.subcategories.map((subcategory) => ({ value: subcategory.id, label: t(`expense.categories.${subcategory.id}`), group: category })),
    ];
  }),
]);
const selected = computed({
  get: (): string => model.value ?? ALL,
  set: (value: string | null): void => {
    model.value = value && value !== ALL ? value : null;
  },
});
</script>
