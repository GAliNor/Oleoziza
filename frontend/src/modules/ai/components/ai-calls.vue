<template>
  <section class="flex min-w-0 flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="eyebrow">{{ $t('ai.monitoring.callsTitle') }}</h3>
      <ui-segmented :model-value="aiStore.usageQuery.feature ?? ALL" :options="filterOptionsComputed" :label="$t('ai.monitoring.filter')" @update:model-value="handleFilter" />
    </div>
    <ui-table :columns="columnsComputed" :rows="usage.calls" row-key="id" :caption="$t('ai.monitoring.callsTitle')" :empty-label="$t('ai.monitoring.noCalls')" />
    <ui-load-more :shown="usage.calls.length" :total="usage.total" :is-loading="aiStore.isUsageLoading" :page-size="PAGE_SIZE" @more="handleMore" />
  </section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAiStore } from 'ai/stores/ai';
import { describeAiError } from 'ai/composables/ai-errors';
import { formatUsd } from 'ai/composables/ai-format';
import { formatDateTime } from 'global/composables/date';
import { formatNumber } from 'global/composables/number';
import { PAGE_SIZE } from 'global/constants/page';
import type { AiCallFeature, IAiUsage } from 'ai/types/ai';
import type { IUiTableColumn } from 'global/types/table';

import UiLoadMore from 'global/components/ui-load-more.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UiTable from 'global/components/ui-table.vue';

// props
defineProps<{ usage: IAiUsage }>();

// stores
const aiStore = useAiStore();
const { t } = useI18n();

// variables
const ALL = 'all';
const FILTERS: AiCallFeature[] = ['assistant', 'assistant_transcription', 'connection_test'];
const MILLISECONDS_PER_SECOND = 1000;

// computed
const filterOptionsComputed = computed((): { key: string; label: string }[] => [{ key: ALL, label: t('ai.monitoring.all') }, ...FILTERS.map((key) => ({ key, label: t(`ai.features.${key}`) }))]);
const columnsComputed = computed((): IUiTableColumn[] => [
  { key: 'createdAt', label: t('ai.monitoring.date'), format: (value) => formatDateTime(String(value)) },
  { key: 'feature', label: t('ai.monitoring.feature'), format: (value) => t(`ai.features.${value}`) },
  { key: 'userName', label: t('ai.monitoring.user'), format: (value) => (value ? String(value) : t('ai.monitoring.system')) },
  { key: 'modelName', label: t('ai.models.model') },
  { key: 'outputTokens', label: t('ai.monitoring.tokens'), isNumeric: true, format: (value) => formatNumber(Number(value)) },
  { key: 'durationInMilliseconds', label: t('ai.monitoring.duration'), isNumeric: true, format: (value) => (value === null ? '—' : `${formatNumber(Number(value) / MILLISECONDS_PER_SECOND, 1, 1)} s`) },
  { key: 'costUsd', label: t('ai.monitoring.cost'), isNumeric: true, format: (value) => formatUsd(Number(value), 4) },
  { key: 'status', label: t('ai.monitoring.status'), format: (value) => t(`ai.status.${value}`) },
  { key: 'errorCode', label: t('ai.monitoring.problem'), format: (value) => (value ? describeAiError(String(value)) : '') },
]);

// event handlers
const handleFilter = (key: string): void => {
  aiStore.filterFeature(key === ALL ? null : (key as AiCallFeature));
};
const handleMore = (): void => {
  void aiStore.fetchUsage(true);
};
</script>
