<template>
  <div class="rise flex flex-col gap-3 rounded-card border border-warning/40 bg-warning-subtle p-4 @xl:flex-row @xl:items-center" role="status">
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-surface text-fg-warning shadow-raised">
      <receipt-line-icon class="h-5 w-5" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="font-medium text-fg-display">{{ $t(draft.mode === 'edit' ? 'expense.draft.titleEdit' : 'expense.draft.title') }}</p>
      <p class="body-two truncate">{{ summaryComputed }}</p>
    </div>
    <div class="flex shrink-0 gap-2">
      <button type="button" class="btn-plain" @click="emit('discard')">{{ $t('expense.draft.discard') }}</button>
      <button type="button" class="btn-primary" @click="emit('resume')">{{ $t('expense.draft.resume') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatDateTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import type { IExpenseDraft } from 'expense/composables/expense-draft-storage';

import ReceiptLineIcon from 'global/icons/receipt-line.icon.vue';

// props
const props = defineProps<{ draft: IExpenseDraft }>();

// emits
const emit = defineEmits<{ (event: 'resume'): void; (event: 'discard'): void }>();

// stores
const { t } = useI18n();

// computed
const summaryComputed = computed((): string => {
  const { payload, savedAt } = props.draft;
  const what = payload.description.trim() || (payload.categoryId ? t(`expense.categories.${payload.categoryId}`) : t('expense.draft.untitled'));
  return [what, payload.amount > 0 ? formatMoney(payload.amount) : '', t('expense.draft.keptAt', { at: formatDateTime(savedAt) })].filter(Boolean).join(' · ');
});
</script>
