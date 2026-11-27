<template>
  <div class="table-card">
    <table class="data-table">
      <caption v-if="caption" class="sr-only">{{ caption }}</caption>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" scope="col" class="px-4 py-3 font-semibold whitespace-nowrap" :class="column.isNumeric ? 'text-end' : 'text-start'">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="rowKey ? String(readCell(row, rowKey)) : index" class="border-t border-subtle" :class="{ 'data-row': isClickable }" @click="handleRow(row)">
          <td v-for="column in columns" :key="column.key" class="px-4 py-3" :class="column.isNumeric ? 'text-end tabular-nums whitespace-nowrap' : 'text-fg-default'">
            <slot :name="`cell-${column.key}`" :row="row" :value="readCell(row, column.key)">{{ column.format ? column.format(readCell(row, column.key)) : (readCell(row, column.key) ?? '—') }}</slot>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="px-4 py-6 text-center text-fg-muted">{{ emptyLabel ?? $t('global.table.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts" generic="R extends object">
// imports
import type { IUiTableColumn } from 'global/types/table';

// props
withDefaults(defineProps<{ columns: IUiTableColumn[]; rows: R[]; caption?: string; rowKey?: string; emptyLabel?: string; isClickable?: boolean }>(), {
  caption: undefined,
  rowKey: undefined,
  emptyLabel: undefined,
  isClickable: false,
});

// emits
const emit = defineEmits<{ (event: 'select', row: R): void }>();

// methods
const readCell = (row: R, key: string): unknown => (row as Record<string, unknown>)[key];

// event handlers
const handleRow = (row: R): void => {
  emit('select', row);
};
</script>
