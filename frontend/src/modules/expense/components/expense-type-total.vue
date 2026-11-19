<template>
  <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-subtle px-4 py-3">
    <button type="button" class="btn-plain -ms-2 ps-2 text-sm" @click="emit('back')">
      <arrow-left-line-icon class="h-4 w-4 rtl:-scale-x-100" />
      {{ $t('expense.view.byType') }}
    </button>
    <p class="min-w-0 flex-1 truncate text-md text-fg-display">
      <span v-if="parentLabelComputed" class="text-fg-secondary-paragraph">{{ parentLabelComputed }} › </span>{{ $t(`expense.categories.${categoryId}`) }}
    </p>
    <p class="flex items-baseline gap-2 whitespace-nowrap">
      <span class="body-three">{{ $t('expense.byType.count', totalComputed.count) }}</span>
      <span class="text-lg font-semibold tabular-nums text-fg-display">{{ formatMoneyRounded(totalComputed.amount) }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatMoneyRounded } from 'global/composables/money';
import type { IExpenseCategoryTotal, IExpenseSummary } from 'expense/types/expense';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// props
const props = defineProps<{ summary: IExpenseSummary; categoryId: string; parentId: string | null }>();

// emits
const emit = defineEmits<{ (event: 'back'): void }>();

// stores
const { t } = useI18n();

// computed
const totalComputed = computed(
  (): Pick<IExpenseCategoryTotal, 'amount' | 'count'> =>
    [...props.summary.bySubcategory, ...props.summary.byCategory].find((row) => row.categoryId === props.categoryId) ?? { amount: 0, count: 0 },
);
const parentLabelComputed = computed((): string | null => (props.parentId && props.parentId !== props.categoryId ? t(`expense.categories.${props.parentId}`) : null));
</script>
