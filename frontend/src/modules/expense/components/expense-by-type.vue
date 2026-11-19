<template>
  <div v-if="!summary" class="grid gap-3 @4xl:grid-cols-2">
    <div v-for="index in 4" :key="index" class="skeleton h-48 rounded-card" />
  </div>
  <ui-empty-state v-else-if="!groupsComputed.length" class="card" :message="$t('expense.breakdown.empty')" />
  <div v-else class="flex min-w-0 flex-col gap-3">
    <div v-if="focusId" class="flex flex-wrap items-center justify-between gap-2">
      <p class="body-two">{{ $t('expense.byType.focus', { category: $t(`expense.categories.${focusId}`) }) }}</p>
      <button type="button" class="btn-plain text-sm" @click="emit('select', null)">{{ $t('expense.byType.allTypes') }}</button>
    </div>
    <div class="columns-1 gap-3 @4xl:columns-2">
      <expense-type-group v-for="group in groupsComputed" :key="group.categoryId" class="mb-3 break-inside-avoid" :group="group" @select="emit('select', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { groupByType } from 'expense/composables/expense-amounts';
import type { IExpenseSummary, IExpenseTypeGroup } from 'expense/types/expense';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import ExpenseTypeGroup from 'expense/components/expense-type-group.vue';

// props
const props = defineProps<{ summary: IExpenseSummary | null; focusId: string | null }>();

// emits
const emit = defineEmits<{ (event: 'select', categoryId: string | null): void }>();

// computed
const groupsComputed = computed((): IExpenseTypeGroup[] => (props.summary ? groupByType(props.summary, props.focusId) : []));
</script>
