<template>
  <ul v-if="warnings.length" class="flex flex-col gap-2" role="status">
    <li v-for="warning in warnings" :key="warning" class="body-two rounded-card border border-warning-subtle bg-warning-subtle px-4 py-3 text-fg-warning">
      {{ $t(`expense.warnings.${warning}`) }}
    </li>
  </ul>
</template>

<script setup lang="ts">
// imports
import type { ExpenseWarning } from 'expense/types/expense';

// props
defineProps<{ warnings: ExpenseWarning[] }>();
</script>
