<template>
  <div class="flex flex-col gap-4">
    <p v-if="!settings.hasSecretsKey" class="rounded-control bg-warning-subtle p-3 text-sm text-fg-warning" role="status">{{ $t('ai.noSecretsKey') }}</p>
    <ui-section v-if="provider" :title="provider.label" :icon="LockLineIcon" tone="olive" :hint="$t('ai.key.sectionHint')">
      <ui-property-list>
        <ui-property :label="$t('ai.key.label')" :hint="$t('ai.key.hint')" :is-locked="!settings.hasSecretsKey" :lock-reason="$t('ai.noSecretsKey')" :save="saveKey" is-explicit :action-label="$t(provider.hasKey ? 'ai.key.replace' : 'ai.key.add')" @start="keyDraft = ''">
          <span class="font-medium tabular-nums">{{ provider.hasKey ? $t('ai.key.saved', { lastFour: provider.keyLastFour }) : $t('ai.key.none') }}</span>
          <template #editor>
            <input v-model="keyDraft" class="input min-h-11 w-full" type="password" autocomplete="off" spellcheck="false" :aria-label="$t('ai.key.label')" :placeholder="$t('ai.key.placeholder')" />
          </template>
          <template #below>
            <ui-confirm-button v-if="provider.hasKey" class="mt-1" :label="$t('ai.key.remove')" :confirm-label="$t('ai.key.removeConfirm')" is-quiet :is-disabled="aiStore.isSaving" @confirm="handleRemoveKey" />
          </template>
        </ui-property>
      </ui-property-list>
    </ui-section>

    <ui-section v-if="provider" :title="$t('ai.budget.label')" :icon="WalletLineIcon" tone="olive" :hint="$t('ai.budget.hint')">
      <ui-property-list>
        <ui-property :label="$t('ai.budget.monthly')" :save="saveBudget" is-explicit :problem="budgetProblemComputed" @start="budgetDraft = provider.monthlyBudgetUsd">
          <span class="text-xl figure text-fg-display">{{ formatUsd(provider.monthlyBudgetUsd) }}</span>
          <span class="block body-three">{{ $t('ai.budget.spent', { spent: formatUsd(provider.spentThisMonthUsd) }) }}</span>
          <template #editor>
            <div class="flex items-center gap-2">
              <input v-model.number="budgetDraft" class="input min-h-11 max-w-36 text-lg figure" type="number" inputmode="decimal" min="0" step="1" :aria-label="$t('ai.budget.monthly')" />
              <span class="body-two">USD</span>
            </div>
          </template>
          <template #below>
            <ui-progress-bar class="mx-2 mt-1 h-1.5" :value="spentPercentComputed" :label="$t('ai.budget.label')" :bar-class="spentPercentComputed >= 90 ? 'bg-danger' : 'bg-primary-olive'" />
          </template>
        </ui-property>
      </ui-property-list>
    </ui-section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAiStore } from 'ai/stores/ai';
import { describeAiError } from 'ai/composables/ai-errors';
import { formatUsd } from 'ai/composables/ai-format';
import type { IAiProvider, IAiSettings } from 'ai/types/ai';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiProgressBar from 'global/components/ui-progress-bar.vue';
import UiProperty from 'global/components/ui-property.vue';
import UiPropertyList from 'global/components/ui-property-list.vue';
import UiSection from 'global/components/ui-section.vue';
import LockLineIcon from 'global/icons/lock-line.icon.vue';
import WalletLineIcon from 'global/icons/wallet-line.icon.vue';

// props
const props = defineProps<{ settings: IAiSettings; provider: IAiProvider | null }>();

// stores
const aiStore = useAiStore();
const { t } = useI18n();

// variables
const MINIMUM_KEY_LENGTH = 8;
const keyDraft = ref('');
const budgetDraft = ref(0);

// computed
const spentPercentComputed = computed((): number => (props.provider && props.provider.monthlyBudgetUsd > 0 ? Math.min(100, (props.provider.spentThisMonthUsd / props.provider.monthlyBudgetUsd) * 100) : 0));
const budgetProblemComputed = computed((): string | null => (Number.isFinite(budgetDraft.value) && budgetDraft.value >= 0 ? null : t('ai.budget.invalid')));

// methods
const saveKey = async (): Promise<true | string> => {
  if (keyDraft.value.trim().length < MINIMUM_KEY_LENGTH) return t('ai.key.tooShort');
  return (await aiStore.saveKey(keyDraft.value.trim())) ? true : describeAiError(aiStore.errorCode);
};
const saveBudget = async (): Promise<true | string> => ((await aiStore.saveBudget(budgetDraft.value)) ? true : describeAiError(aiStore.errorCode));

// event handlers
const handleRemoveKey = (): void => {
  void aiStore.removeKey();
};
</script>
