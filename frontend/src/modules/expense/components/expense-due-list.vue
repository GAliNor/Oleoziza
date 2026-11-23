<template>
  <div class="flex flex-col gap-5 transition-opacity duration-200" :class="{ 'opacity-50': list.isLoading && list.items.length }" :aria-busy="list.isLoading">
    <div v-if="list.isLoading && !list.items.length" class="flex flex-col gap-2">
      <div v-for="index in 4" :key="index" class="skeleton h-16 rounded-card" />
    </div>
    <ui-empty-state v-else-if="!list.items.length" class="card" size="compact" :message="$t('expense.due.empty')" />
    <section v-for="group in groupsComputed" v-else :key="group.group" class="flex flex-col gap-2">
      <h2 class="flex items-center gap-2 px-1 eyebrow" :class="{ 'text-fg-danger': group.group === 'late' }">{{ $t(`expense.due.groups.${group.group}`) }}</h2>
      <TransitionGroup tag="ul" name="row-in" class="card flex flex-col divide-y divide-default overflow-hidden p-0">
        <li v-for="expense in group.expenses" :key="expense.id">
          <button type="button" class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start transition-colors duration-200 ease-(--ease-premium) hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus" :class="{ 'bg-selected/40': expense.id === selectedId }" @click="emit('open', expense.id)">
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: EXPENSE_CATEGORY_COLORS[categoryIdOf(categories, expense.categoryId)] }" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 font-medium text-fg-display sm:truncate">{{ expenseTitle(expense) }}</span>
              <span class="flex flex-wrap items-center gap-x-1.5 body-two">
                <span class="font-medium" :class="group.group === 'late' ? 'text-fg-danger' : 'text-fg-primary-paragraph'">{{ dueLabel(expense) }}</span>
                <span v-if="expenseTitle(expense) !== $t(`expense.categories.${expense.categoryId}`)">· {{ $t(`expense.categories.${expense.categoryId}`) }}</span>
                <span v-if="expense.frequency" class="inline-flex items-center gap-1"><repeat-line-icon class="h-3.5 w-3.5" />{{ $t(`expense.frequency.${expense.frequency}`) }}</span>
              </span>
            </span>
            <span class="shrink-0 text-end font-semibold tabular-nums" :class="expense.amount === null ? 'body-two' : 'text-fg-display'">{{ expense.amount === null ? $t('expense.due.unknownAmount') : formatMoney(expense.amount) }}</span>
            <chevron-right-line-icon class="h-5 w-5 shrink-0 text-fg-muted rtl:-scale-x-100" />
          </button>
        </li>
      </TransitionGroup>
    </section>
  </div>
  <ui-pagination :page="list.page" :page-count="pageCountComputed" :total="list.total" :page-size="PAGE_SIZE" @update:page="emit('page', $event)" />
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { categoryIdOf } from 'expense/composables/expense-amounts';
import { daysUntil, groupByDue } from 'expense/composables/expense-due';
import { expenseTitle } from 'expense/composables/expense-title';
import { EXPENSE_CATEGORY_COLORS } from 'expense/constants/expense';
import { formatMoney } from 'global/composables/money';
import { formatShortDate, todayIso } from 'global/composables/date';
import { PAGE_SIZE } from 'global/constants/page';
import type { IExpense, IExpenseCategory, IExpenseListQuery } from 'expense/types/expense';
import type { IPageList } from 'global/types/page';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';
import RepeatLineIcon from 'global/icons/repeat-line.icon.vue';

// props
const props = defineProps<{ list: IPageList<IExpense, IExpenseListQuery>; categories: IExpenseCategory[]; selectedId: string | null }>();

// emits
const emit = defineEmits<{ (event: 'open', id: string): void; (event: 'page', page: number): void }>();

// stores
const { t } = useI18n();

// computed
const pageCountComputed = computed((): number => Math.max(1, Math.ceil(props.list.total / PAGE_SIZE)));
const groupsComputed = computed(() => groupByDue(props.list.items, todayIso()));

// methods
const dueLabel = (expense: IExpense): string => {
  const dueOn = expense.dueOn ?? '';
  const days = daysUntil(dueOn, todayIso());
  return `${formatShortDate(`${dueOn}T12:00:00`)} · ${days < 0 ? t('expense.due.lateBy', { count: -days }, -days) : t('expense.due.inDays', { count: days }, days)}`;
};
</script>
