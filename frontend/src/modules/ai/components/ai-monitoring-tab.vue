<template>
  <div class="flex flex-col gap-5" :aria-busy="aiStore.isUsageLoading || undefined">
    <div class="flex items-center gap-2">
      <button type="button" class="icon-btn" :aria-label="$t('ai.monitoring.previousMonth')" @click="handleMonth(-1)"><chevron-right-line-icon class="h-5 w-5 rotate-180 rtl:rotate-0" /></button>
      <h2 class="min-w-40 text-center heading-three capitalize" aria-live="polite">{{ formatMonth(aiStore.usageQuery.month) }}</h2>
      <button type="button" class="icon-btn" :disabled="aiStore.isCurrentMonth" :aria-label="$t('ai.monitoring.nextMonth')" @click="handleMonth(1)"><chevron-right-line-icon class="h-5 w-5 rtl:rotate-180" /></button>
    </div>

    <ui-empty-state v-if="aiStore.hasUsageError && !usageComputed" class="card" tone="danger" size="compact" :message="$t('ai.monitoring.error')">
      <template #action>
        <button type="button" class="btn-secondary" @click="handleRetry">{{ $t('ai.retry') }}</button>
      </template>
    </ui-empty-state>
    <template v-else-if="usageComputed">
      <div class="stagger grid gap-3 sm:grid-cols-3">
        <ui-stat-tile :label="$t('ai.monitoring.spent')" :value="spentComputed" :format="formatUsdValue" :sub="budgetComputed ? $t('ai.monitoring.ofBudget', { budget: formatUsd(budgetComputed.monthlyBudgetUsd) }) : undefined" :progress="spentPercentComputed" />
        <ui-stat-tile :label="$t('ai.monitoring.calls')" :value="callCountComputed" :sub="$t('ai.monitoring.averageCost', { cost: formatUsd(averageCostComputed, 4) })" />
        <ui-stat-tile :label="$t('ai.monitoring.remaining')" :value="remainingComputed" :format="formatUsdValue" :sub="budgetComputed?.reservedUsd ? $t('ai.monitoring.reserved', { amount: formatUsd(budgetComputed.reservedUsd, 4) }) : undefined" :value-class="spentPercentComputed >= 90 ? 'text-fg-danger' : 'text-fg-display'" />
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <section class="flex min-w-0 flex-col gap-2">
          <h3 class="eyebrow">{{ $t('ai.monitoring.byFeature') }}</h3>
          <ui-table :columns="featureColumnsComputed" :rows="usageComputed.byFeature" row-key="key" :caption="$t('ai.monitoring.byFeature')" :empty-label="$t('ai.monitoring.empty')" />
        </section>
        <section class="flex min-w-0 flex-col gap-2">
          <h3 class="eyebrow">{{ $t('ai.monitoring.byMember') }}</h3>
          <ui-table :columns="memberColumnsComputed" :rows="usageComputed.byMember" row-key="key" :caption="$t('ai.monitoring.byMember')" :empty-label="$t('ai.monitoring.empty')" />
        </section>
      </div>

      <ai-calls :usage="usageComputed" />
      <p class="body-three">{{ $t('ai.monitoring.privacy') }}</p>
    </template>
    <div v-else class="flex flex-col gap-3" role="status">
      <span class="sr-only">{{ $t('ai.loading') }}</span>
      <div class="grid gap-3 sm:grid-cols-3">
        <div v-for="index in 3" :key="index" class="skeleton h-32 rounded-card" />
      </div>
      <div class="skeleton h-64 rounded-card" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAiStore } from 'ai/stores/ai';
import { formatMonth, formatUsd } from 'ai/composables/ai-format';
import type { IAiProviderBudget, IAiUsage } from 'ai/types/ai';
import type { IUiTableColumn } from 'global/types/table';

import AiCalls from 'ai/components/ai-calls.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiStatTile from 'global/components/ui-stat-tile.vue';
import UiTable from 'global/components/ui-table.vue';
import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';

// stores
const aiStore = useAiStore();
const { t, te } = useI18n();

// computed
const usageComputed = computed((): IAiUsage | null => aiStore.usage);
const budgetComputed = computed((): IAiProviderBudget | null => usageComputed.value?.budgets[0] ?? null);
const spentComputed = computed((): number => usageComputed.value?.byFeature.reduce((sum, item) => sum + item.costUsd, 0) ?? 0);
const callCountComputed = computed((): number => usageComputed.value?.byFeature.reduce((sum, item) => sum + item.callCount, 0) ?? 0);
const averageCostComputed = computed((): number => (callCountComputed.value ? spentComputed.value / callCountComputed.value : 0));
const remainingComputed = computed((): number => Math.max(0, (budgetComputed.value?.monthlyBudgetUsd ?? 0) - spentComputed.value));
const spentPercentComputed = computed((): number => {
  const budget = budgetComputed.value?.monthlyBudgetUsd ?? 0;
  return budget > 0 ? Math.min(100, (spentComputed.value / budget) * 100) : 0;
});
const featureColumnsComputed = computed((): IUiTableColumn[] => [
  { key: 'key', label: t('ai.monitoring.feature'), format: (value) => labelFeature(String(value)) },
  { key: 'callCount', label: t('ai.monitoring.calls'), isNumeric: true },
  { key: 'costUsd', label: t('ai.monitoring.cost'), isNumeric: true, format: (value) => formatUsd(Number(value), 4) },
]);
const memberColumnsComputed = computed((): IUiTableColumn[] => [
  { key: 'label', label: t('ai.monitoring.user'), format: (value) => (value ? String(value) : t('ai.monitoring.system')) },
  { key: 'callCount', label: t('ai.monitoring.calls'), isNumeric: true },
  { key: 'costUsd', label: t('ai.monitoring.cost'), isNumeric: true, format: (value) => formatUsd(Number(value), 4) },
]);

// methods
const formatUsdValue = (value: number): string => formatUsd(value);
const labelFeature = (feature: string): string => (te(`ai.features.${feature}`) ? t(`ai.features.${feature}`) : feature);

// event handlers
const handleMonth = (step: number): void => {
  aiStore.shiftMonth(step);
};
const handleRetry = (): void => {
  void aiStore.fetchUsage();
};

// lifecycle
onMounted(() => void aiStore.fetchUsage());
</script>
