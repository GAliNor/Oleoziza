<template>
  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr>
          <th class="px-4 py-3 font-semibold">{{ $t('expense.register.columns.date') }}</th>
          <th class="px-4 py-3 font-semibold">{{ $t('expense.register.columns.label') }}</th>
          <th class="hidden px-4 py-3 font-semibold @4xl:table-cell">{{ $t('expense.register.columns.supplier') }}</th>
          <th class="hidden px-4 py-3 font-semibold @2xl:table-cell">{{ $t('expense.register.columns.paidBy') }}</th>
          <th class="px-4 py-3 text-end font-semibold">{{ $t('expense.register.columns.amount') }}</th>
        </tr>
      </thead>
      <TransitionGroup tag="tbody" name="row-in" class="transition-opacity duration-200" :class="{ 'opacity-50': list.isLoading && list.items.length }">
        <tr
          v-for="expense in list.items"
          :key="expense.id"
          class="data-row"
          :class="{ 'bg-selected/40': expense.id === selectedId, 'text-fg-secondary-paragraph': expense.status === 'cancelled' }"
          tabindex="0"
          @click="emit('open', expense.id)"
          @keydown.enter="emit('open', expense.id)"
        >
          <td class="px-4 py-3 whitespace-nowrap text-fg-primary-paragraph">{{ formatShortDate(`${expense.date}T12:00:00`) }}</td>
          <td class="px-4 py-3">
            <p class="font-medium" :class="expense.status === 'cancelled' ? 'line-through' : 'text-fg-display'">{{ expense.description }}</p>
            <p class="body-two">
              <span class="me-1.5 inline-block h-2 w-2 rounded-full align-middle" :style="{ background: EXPENSE_CATEGORY_COLORS[categoryIdOf(categories, expense.categoryId)] }" />
              {{ $t(`expense.categories.${expense.categoryId}`) }}<span class="hidden whitespace-nowrap @xl:inline"> · {{ expense.code }}</span>
              <span v-if="expense.status === 'cancelled'" class="chip ms-1 bg-danger-subtle text-fg-danger">{{ $t('expense.register.cancelled') }}</span>
              <span v-else-if="hasWarning(expense)" class="chip ms-1 bg-warning-subtle text-fg-warning">{{ $t('expense.register.warning') }}</span>
            </p>
          </td>
          <td class="hidden px-4 py-3 text-fg-primary-paragraph @4xl:table-cell">{{ expense.supplier }}</td>
          <td class="hidden px-4 py-3 whitespace-nowrap @2xl:table-cell">
            {{ $t(`expense.paidBy.${expense.paidBy}`) }}
            <span v-if="expense.documents.length" class="chip ms-1 bg-subtle text-fg-primary-paragraph">{{ $t('expense.register.documents', expense.documents.length) }}</span>
            <span v-else class="chip ms-1 bg-subtle text-fg-secondary-paragraph">{{ $t('expense.register.noDocument') }}</span>
          </td>
          <td class="px-4 py-3 text-end font-semibold whitespace-nowrap tabular-nums" :class="expense.status === 'cancelled' ? 'line-through' : 'text-fg-accent'">−{{ formatMoney(expense.amount) }}</td>
        </tr>
      </TransitionGroup>
    </table>
    <div v-if="list.isLoading && !list.items.length" class="flex flex-col gap-2 p-3">
      <div v-for="index in 5" :key="index" class="skeleton h-12 rounded-control" />
    </div>
    <ui-empty-state v-else-if="!list.items.length" :message="$t('expense.register.empty')" />
  </div>
  <ui-pagination :page="list.page" :page-count="pageCountComputed" :total="list.total" :page-size="PAGE_SIZE" @update:page="emit('page', $event)" />
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { categoryIdOf } from 'expense/composables/expense-amounts';
import { expenseWarnings } from 'expense/composables/expense-warnings';
import { EXPENSE_CATEGORY_COLORS } from 'expense/constants/expense';
import { formatMoney } from 'global/composables/money';
import { formatShortDate } from 'global/composables/date';
import { PAGE_SIZE } from 'global/constants/page';
import type { IExpense, IExpenseCategory, IExpenseListQuery } from 'expense/types/expense';
import type { IPageList } from 'global/types/page';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiPagination from 'global/components/ui-pagination.vue';

// props
const props = defineProps<{ list: IPageList<IExpense, IExpenseListQuery>; categories: IExpenseCategory[]; selectedId: string | null }>();

// emits
const emit = defineEmits<{ (event: 'open', id: string): void; (event: 'page', page: number): void }>();

// computed
const pageCountComputed = computed((): number => Math.max(1, Math.ceil(props.list.total / PAGE_SIZE)));

// methods
const hasWarning = (expense: IExpense): boolean => expenseWarnings(expense, props.categories).length > 0;
</script>
