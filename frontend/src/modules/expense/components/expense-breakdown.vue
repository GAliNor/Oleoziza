<template>
  <section class="card flex min-w-0 flex-col gap-4 p-5">
    <header class="flex items-baseline justify-between gap-3">
      <h2 class="heading-four">{{ title ?? $t('expense.breakdown.title') }}</h2>
      <button v-if="isInteractive && activeId" type="button" class="btn-plain text-sm" @click="emit('select', null)">{{ $t('expense.register.allCategories') }}</button>
    </header>

    <p v-if="!rowsComputed.length" class="body-two">{{ $t('expense.breakdown.empty') }}</p>

    <template v-else-if="layout === 'bar'">
      <div class="flex h-3 w-full gap-0.5 overflow-hidden rounded-control bg-neutral-100" aria-hidden="true">
        <span
          v-for="row in rowsComputed"
          :key="row.categoryId"
          class="bar h-full transition-opacity"
          :class="{ 'opacity-30': activeId && row.categoryId !== activeId }"
          :style="{ width: `${row.shareOfTotal}%`, background: EXPENSE_CATEGORY_COLORS[row.categoryId] }"
        />
      </div>
      <ul class="flex flex-wrap gap-2">
        <li v-for="row in rowsComputed" :key="row.categoryId">
          <component
            :is="isInteractive ? 'button' : 'span'"
            :type="isInteractive ? 'button' : undefined"
            class="flex items-center gap-2 rounded-control border border-subtle px-3 py-1.5 text-sm"
            :class="[isInteractive ? 'transition hover:bg-page' : '', row.categoryId === activeId ? 'bg-selected/60' : '', activeId && row.categoryId !== activeId ? 'opacity-55' : '']"
            :aria-pressed="isInteractive ? row.categoryId === activeId : undefined"
            :aria-label="isInteractive ? $t('expense.breakdown.filter', { category: row.label }) : undefined"
            @click="isInteractive && handleSelect(row.categoryId)"
          >
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: EXPENSE_CATEGORY_COLORS[row.categoryId] }" />
            <span class="text-fg-primary-paragraph">{{ row.label }}</span>
            <span class="tabular-nums text-fg-display">{{ formatMoneyRounded(row.amount) }}</span>
          </component>
        </li>
      </ul>
    </template>

    <ul v-else class="flex flex-col gap-1">
      <li v-for="row in rowsComputed" :key="row.categoryId">
        <component
          :is="isInteractive ? 'button' : 'div'"
          :type="isInteractive ? 'button' : undefined"
          class="flex w-full flex-col gap-1.5 rounded-control px-2 py-1.5 text-start"
          :class="[isInteractive ? 'transition hover:bg-page' : '', row.categoryId === activeId ? 'bg-selected/50' : '', activeId && row.categoryId !== activeId ? 'opacity-55' : '']"
          :aria-pressed="isInteractive ? row.categoryId === activeId : undefined"
          :aria-label="isInteractive ? $t('expense.breakdown.filter', { category: row.label }) : undefined"
          @click="isInteractive && handleSelect(row.categoryId)"
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
const props = withDefaults(defineProps<{ summary: IExpenseSummary; activeId?: string | null; isInteractive?: boolean; title?: string; layout?: 'list' | 'bar' }>(), {
  activeId: null,
  isInteractive: false,
  title: undefined,
  layout: 'list',
});

// emits
const emit = defineEmits<{ (event: 'select', categoryId: string | null): void }>();

// stores
const { t } = useI18n();

// computed
const rowsComputed = computed(() => {
  const largest = props.summary.byCategory[0]?.amount || 1;
  const total = props.summary.total || 1;
  return props.summary.byCategory.map((row) => ({ ...row, label: t(`expense.categories.${row.categoryId}`), shareOfLargest: (row.amount / largest) * 100, shareOfTotal: (row.amount / total) * 100 }));
});

// event handlers
const handleSelect = (categoryId: string): void => emit('select', categoryId === props.activeId ? null : categoryId);
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
