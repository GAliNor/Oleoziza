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

      <dl class="flex flex-col">
        <div class="flex items-baseline justify-between gap-4 pb-2">
          <dt class="body-two">{{ $t('dashboard.management.result.revenue') }}</dt>
          <dd class="text-lg figure text-fg-display">{{ formatMoneyRounded(figuresComputed.revenue) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-4 border-b border-default pb-3">
          <dt class="body-two">{{ $t('dashboard.management.result.expenses') }}</dt>
          <dd class="text-lg figure text-fg-accent">{{ formatMoneyRounded(-summaryComputed.operating) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-4 pt-3">
          <dt class="flex flex-col">
            <span class="label">{{ $t('dashboard.management.result.result') }}</span>
            <span class="body-three">{{ marginComputed }}</span>
          </dt>
          <dd class="text-display-xs figure" :class="resultComputed >= 0 ? 'text-fg-brand' : 'text-fg-danger'">{{ formatMoneyRounded(resultComputed) }}</dd>
        </div>
      </dl>

      <div v-if="figuresComputed.revenue > 0" class="flex h-1.5 gap-0.5 overflow-hidden rounded-control" aria-hidden="true">
        <span v-if="expenseShareComputed > 0" class="bg-accent-brown transition-[width] duration-500" :style="{ width: `${expenseShareComputed}%` }" />
        <span class="flex-1 bg-primary-olive-mid" />
      </div>

      <p v-if="summaryComputed.investments > 0" class="body-three">
        {{ $t('dashboard.management.result.investments', { amount: formatMoneyRounded(summaryComputed.investments) }) }}
      </p>
    </div>
    <expense-breakdown
      class="lg:col-span-2"
      :summary="operatingSummaryComputed"
      :title="$t('dashboard.management.result.byCategory')"
      :link-query="canOpenExpenses ? { period: period.key === DEFAULT_PERIOD ? undefined : period.key } : null"
    />
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
const expenseShareComputed = computed((): number => {
  const revenue = figuresComputed.value?.revenue ?? 0;
  return revenue ? Math.min(100, ((summaryComputed.value?.operating ?? 0) / revenue) * 100) : 0;
});
/** Percent with a true minus sign, like the money figures. */
const signedPercent = (value: number): string => `${value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;

const marginComputed = computed((): string => {
  const revenue = figuresComputed.value?.revenue ?? 0;
  return revenue ? t('dashboard.management.result.margin', { percent: signedPercent(Math.round((resultComputed.value / revenue) * 100)) }) : t('dashboard.management.result.noRevenue');
});
</script>
