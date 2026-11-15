<template>
  <div v-if="!summaryComputed || !figuresComputed || !operatingSummaryComputed" class="skeleton h-56 rounded-card" />
  <section v-else class="grid min-w-0 gap-3 lg:grid-cols-5 lg:items-start">
    <div class="card flex min-w-0 flex-col gap-5 p-5 lg:col-span-3">
      <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="heading-four">{{ $t('dashboard.management.result.title', { period: period.label }) }}</h2>
        <router-link v-if="canOpenExpenses" :to="{ name: 'expense', query: { period: period.key === DEFAULT_PERIOD ? undefined : period.key } }" class="btn-plain text-sm">
          {{ $t('dashboard.management.result.open') }}
        </router-link>
      </header>

      <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-x-3 gap-y-4 sm:grid-cols-[1fr_auto_1fr_auto_1.2fr]">
        <div class="min-w-0">
          <p class="eyebrow">{{ $t('dashboard.management.result.revenue') }}</p>
          <p class="text-xl figure text-fg-display sm:text-display-xs">{{ formatMoneyRounded(figuresComputed.revenue) }}</p>
        </div>
        <span class="pb-1 text-xl text-fg-secondary-paragraph" aria-hidden="true">−</span>
        <div class="min-w-0">
          <p class="eyebrow">{{ $t('dashboard.management.result.expenses') }}</p>
          <p class="text-xl figure text-fg-accent sm:text-display-xs">{{ formatMoneyRounded(summaryComputed.operating) }}</p>
        </div>
        <span class="hidden pb-1 text-xl text-fg-secondary-paragraph sm:block" aria-hidden="true">=</span>
        <div class="col-span-3 min-w-0 rounded-card bg-subtle p-4 sm:col-span-1">
          <p class="eyebrow">{{ $t('dashboard.management.result.result') }}</p>
          <p class="text-display-xs figure" :class="resultComputed >= 0 ? 'text-fg-brand' : 'text-fg-danger'">{{ formatMoneyRounded(resultComputed) }}</p>
          <p class="body-three">{{ marginComputed }}</p>
        </div>
      </div>

      <p class="body-two border-t border-subtle pt-4">
        {{ $t('dashboard.management.result.investments', { amount: formatMoneyRounded(summaryComputed.investments) }) }}
      </p>
    </div>
    <expense-breakdown class="lg:col-span-2" :summary="operatingSummaryComputed" :title="$t('dashboard.management.result.byCategory')" />
  </section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useExpenseStore } from 'expense/stores/expense';
import { useFinanceStore } from 'finance/stores/finance';
import { useSiteStore } from 'site/stores/site';
import { resultOf } from 'expense/composables/expense-amounts';
import { formatNumber } from 'global/composables/number';
import { INVESTMENT_CATEGORY_ID } from 'expense/constants/expense-categories';
import { formatMoneyRounded } from 'global/composables/money';
import { DEFAULT_PERIOD } from 'global/constants/period';
import type { IExpenseSummary } from 'expense/types/expense';
import type { IPeriod } from 'global/types/period';

import ExpenseBreakdown from 'expense/components/expense-breakdown.vue';

// props
defineProps<{ period: IPeriod }>();

// stores
const { t } = useI18n();
const expenseStore = useExpenseStore();
const financeStore = useFinanceStore();
const siteStore = useSiteStore();

// computed
const summaryComputed = computed(() => expenseStore.summary);
const figuresComputed = computed(() => financeStore.sales?.figures ?? null);
const canOpenExpenses = computed((): boolean => siteStore.can(['expense.record', 'finance.view']));
const operatingSummaryComputed = computed((): IExpenseSummary | null =>
  summaryComputed.value ? { ...summaryComputed.value, total: summaryComputed.value.operating, byCategory: summaryComputed.value.byCategory.filter((row) => row.categoryId !== INVESTMENT_CATEGORY_ID) } : null,
);
const resultComputed = computed((): number => (summaryComputed.value && figuresComputed.value ? resultOf(figuresComputed.value.revenue, summaryComputed.value) : 0));
/** Percent with a true minus sign, like the money figures. */
const signedPercent = (value: number): string => `${value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;

const marginComputed = computed((): string => {
  const revenue = figuresComputed.value?.revenue ?? 0;
  return revenue ? t('dashboard.management.result.margin', { percent: signedPercent(Math.round((resultComputed.value / revenue) * 100)) }) : t('dashboard.management.result.noRevenue');
});
</script>
