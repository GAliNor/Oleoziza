<template>
  <ui-stat-tile v-if="block.type === 'number' && numberValueComputed !== null" :label="block.title" :value="numberValueComputed" :format="formatNumberValue" :delta="deltaComputed" :delta-label="deltaComputed ? $t('assistant.chat.comparedLabel') : undefined" :is-delta-good="isDeltaGoodComputed" />
  <div v-else-if="block.type === 'bar_chart' && barsComputed.length" class="card flex min-w-0 flex-col gap-2 p-5">
    <ui-bar-chart :title="block.title" :series="SERIES" :bars="barsComputed">
      <template #tooltip="{ bar }">
        <p>{{ formatAnswerValue(bar.values.value, valueKindComputed, block.valueField ?? '') }}</p>
      </template>
    </ui-bar-chart>
  </div>
  <section v-else-if="block.type === 'cards'" class="flex min-w-0 flex-col gap-2">
    <h3 class="eyebrow">{{ block.title }}</h3>
    <ul class="stagger grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      <li v-for="record in block.records" :key="record.id"><assistant-record :record="record" /></li>
    </ul>
    <p v-if="!block.records.length" class="body-two">{{ $t('assistant.chat.noRecords') }}</p>
  </section>
  <section v-else class="flex min-w-0 flex-col gap-2">
    <h3 class="eyebrow">{{ block.title }}</h3>
    <ui-table :columns="columnsComputed" :rows="block.rows" :caption="block.title" :empty-label="$t('assistant.chat.noRecords')" />
  </section>
  <p v-if="block.isTruncated" class="caption">{{ $t('assistant.chat.truncated') }}</p>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { formatAnswerValue, isNumericKind, labelColumn } from 'assistant/composables/answer-format';
import { formatDelta } from 'global/composables/number';
import type { ColumnKind, IAnswerBlock } from 'assistant/types/assistant';
import type { IChartBar, IChartSeries } from 'global/types/chart';
import type { IUiTableColumn } from 'global/types/table';

import AssistantRecord from 'assistant/components/assistant-record.vue';
import UiBarChart from 'global/components/ui-bar-chart.vue';
import UiStatTile from 'global/components/ui-stat-tile.vue';
import UiTable from 'global/components/ui-table.vue';

// props
const props = defineProps<{ block: IAnswerBlock }>();

// variables
const SERIES: IChartSeries[] = [{ key: 'value', colorClass: 'bg-primary-olive-light', hoverClass: 'bg-primary-olive-mid', currentClass: 'bg-primary-olive-dark' }];

// computed
const kindsComputed = computed((): Record<string, ColumnKind> => Object.fromEntries(props.block.columns.map((column) => [column.key, column.kind])));
const valueKindComputed = computed((): ColumnKind => kindsComputed.value[props.block.valueField ?? ''] ?? 'number');
const numberValueComputed = computed((): number | null => {
  const value = props.block.rows[0]?.[props.block.valueField ?? ''];
  return value === null || value === undefined ? null : Number(value);
});
const deltaComputed = computed((): string | undefined => {
  const change = props.block.rows[0]?.[`${props.block.valueField}_change_pct`];
  return change === null || change === undefined ? undefined : formatDelta(Number(change));
});
const isDeltaGoodComputed = computed((): boolean => Number(props.block.rows[0]?.[`${props.block.valueField}_change_pct`] ?? 0) >= 0);
const columnsComputed = computed((): IUiTableColumn[] =>
  props.block.columns
    .filter((column) => column.kind !== 'id')
    .map((column) => ({ key: column.key, label: labelColumn(column.key), isNumeric: isNumericKind(column.kind), format: (value: unknown) => formatAnswerValue(value, column.kind, column.key) })),
);
const barsComputed = computed((): IChartBar[] => {
  const labelField = props.block.labelField ?? '';
  const labelKind = kindsComputed.value[labelField] ?? 'text';
  return props.block.rows.map((row) => ({ label: formatAnswerValue(row[labelField], labelKind, labelField), values: { value: Number(row[props.block.valueField ?? ''] ?? 0) } }));
});

// methods
const formatNumberValue = (value: number): string => formatAnswerValue(value, valueKindComputed.value, props.block.valueField ?? '', true);
</script>
