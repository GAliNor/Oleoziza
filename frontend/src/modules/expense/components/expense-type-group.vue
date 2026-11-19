<template>
  <section class="card overflow-hidden" :aria-labelledby="headingId">
    <button type="button" class="type-row gap-x-3 py-4" :aria-label="$t('expense.byType.open', { type: categoryLabelComputed })" @click="emit('select', group.categoryId)">
      <span class="flex min-w-0 items-center gap-2.5">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: colorComputed }" aria-hidden="true" />
        <span :id="headingId" class="truncate heading-five">{{ categoryLabelComputed }}</span>
      </span>
      <span class="flex items-baseline gap-2 justify-self-end">
        <span class="hidden body-three @xl:inline">{{ $t('expense.byType.count', group.count) }}</span>
        <span class="text-lg font-semibold whitespace-nowrap tabular-nums text-fg-display">{{ formatMoneyRounded(group.amount) }}</span>
      </span>
      <chevron-right-line-icon class="h-4 w-4 text-fg-muted rtl:-scale-x-100" aria-hidden="true" />
      <span v-if="isInvestmentComputed" class="col-span-3 body-three">{{ $t('expense.byType.investmentNote') }}</span>
    </button>

    <ul class="border-t border-subtle">
      <li v-for="row in group.rows" :key="row.categoryId" class="border-b border-subtle last:border-b-0">
        <button type="button" class="type-row gap-y-2 py-3" @click="emit('select', row.categoryId)">
          <span class="min-w-0">
            <span class="block truncate text-md text-fg-display">{{ $t(`expense.categories.${row.categoryId}`) }}</span>
            <span class="block body-three">{{ $t('expense.byType.count', row.count) }}</span>
          </span>
          <span class="justify-self-end text-md font-semibold whitespace-nowrap tabular-nums text-fg-display">{{ formatMoneyRounded(row.amount) }}</span>
          <chevron-right-line-icon class="h-4 w-4 text-fg-muted rtl:-scale-x-100" aria-hidden="true" />
          <span class="col-span-3 h-1 overflow-hidden rounded-control bg-neutral-100" aria-hidden="true">
            <span class="share block h-full rounded-control" :style="{ width: `${shareOf(row.amount)}%`, background: colorComputed }" />
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatMoneyRounded } from 'global/composables/money';
import { EXPENSE_CATEGORY_COLORS } from 'expense/constants/expense';
import { INVESTMENT_CATEGORY_ID } from 'expense/constants/expense-categories';
import type { IExpenseTypeGroup } from 'expense/types/expense';

import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';

// props
const props = defineProps<{ group: IExpenseTypeGroup }>();

// emits
const emit = defineEmits<{ (event: 'select', categoryId: string): void }>();

// stores
const { t } = useI18n();

// variables
const headingId = useId();

// computed
const categoryLabelComputed = computed((): string => t(`expense.categories.${props.group.categoryId}`));
const colorComputed = computed((): string => EXPENSE_CATEGORY_COLORS[props.group.categoryId] ?? 'var(--color-neutral-500)');
const isInvestmentComputed = computed((): boolean => props.group.categoryId === INVESTMENT_CATEGORY_ID);

// methods
const shareOf = (amount: number): number => (props.group.amount ? Math.max(2, (amount / props.group.amount) * 100) : 0);
</script>

<style scoped>
@reference "~/style.css";

.type-row {
  @apply grid min-h-14 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-4 px-5 text-start transition-colors duration-150 hover:bg-page focus-visible:bg-page focus-visible:outline-none;
}

.share {
  animation: share-in 700ms var(--ease-premium) backwards;
}

@keyframes share-in {
  from {
    width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .share {
    animation: none;
  }
}
</style>
