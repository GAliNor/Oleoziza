<template>
  <section class="card flex min-w-0 flex-col gap-4 p-5">
    <h2 class="heading-four">{{ title ?? $t('expense.breakdown.title') }}</h2>

    <p v-if="!rowsComputed.length" class="body-two">{{ $t('expense.breakdown.empty') }}</p>

    <ul v-else class="flex flex-col gap-1">
      <li v-for="row in rowsComputed" :key="row.categoryId">
        <component
          :is="linkQuery ? 'router-link' : 'div'"
          :to="linkQuery ? { name: 'expense', query: { ...linkQuery, category: row.categoryId } } : undefined"
          class="flex w-full flex-col gap-1.5 rounded-control px-2 py-1.5 text-start"
          :class="{ 'transition hover:bg-page focus-visible:bg-page focus-visible:outline-none': linkQuery }"
          :aria-label="linkQuery ? $t('expense.breakdown.filter', { category: row.label }) : undefined"
        >
          <span class="flex items-baseline justify-between gap-3 text-sm">
            <span class="flex min-w-0 items-center gap-2 text-fg-primary-paragraph">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: EXPENSE_CATEGORY_COLORS[row.categoryId] }" />
              <span class="truncate">{{ row.label }}</span>
            </span>
            <span class="shrink-0 tabular-nums text-fg-display">{{ formatMoneyRounded(row.amount) }}</span>
          </span>
          <span class="h-1.5 w-full overflow-hidden rounded-control bg-neutral-100">
            <span class="bar block h-full rounded-control" :style="{ width: `${row.shareOfLargest}%`, background: EXPENSE_CATEGORY_COLORS[row.categoryId] }" />
          </span>
        </component>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatMoneyRounded } from 'global/composables/money';
import { EXPENSE_CATEGORY_COLORS } from 'expense/constants/expense';
import type { IExpenseSummary } from 'expense/types/expense';

// props
const props = withDefaults(
  defineProps<{
    summary: IExpenseSummary;
    title?: string;
    /** When given, each row opens the Charges page « Par type » on its category, with this query (the period) kept. */
    linkQuery?: Record<string, string | undefined> | null;
  }>(),
  { title: undefined, linkQuery: null },
);

// stores
const { t } = useI18n();

// computed
const rowsComputed = computed(() => {
  const largest = props.summary.byCategory[0]?.amount || 1;
  return props.summary.byCategory.map((row) => ({ ...row, label: t(`expense.categories.${row.categoryId}`), shareOfLargest: (row.amount / largest) * 100 }));
});
</script>

<style scoped>
.bar {
  animation: bar-in 700ms var(--ease-premium) backwards;
}

@keyframes bar-in {
  from {
    width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    animation: none;
  }
}
</style>
