<template>
  <div class="flex flex-col gap-4">
    <ui-section :title="$t('ai.models.featuresTitle')" :icon="SparkleLineIcon" tone="olive" :hint="$t('ai.models.featuresHint')">
      <ul class="flex flex-col divide-y divide-subtle">
        <li v-for="item in featureRowsComputed" :key="item.feature" class="flex flex-col gap-3 px-2 py-3 md:flex-row md:items-center">
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="label text-fg-display">{{ $t(`ai.features.${item.feature}`) }}</span>
            <span class="body-three">{{ $t(`ai.models.featureDetail.${item.feature}`) }}</span>
          </span>
          <div class="flex flex-wrap items-center gap-2">
            <ui-select class="min-w-56" :model-value="item.modelId" :options="item.options" :label="$t('ai.models.model')" :is-disabled="aiStore.isSaving || !provider?.hasKey" @update:model-value="(modelId) => handleModel(item.feature, modelId)" />
            <span v-if="item.modelId && aiStore.testedModels[item.modelId]" class="chip" :class="aiStore.testedModels[item.modelId].isOk ? 'bg-success-subtle text-fg-success' : 'bg-danger-subtle text-fg-danger'">
              {{ aiStore.testedModels[item.modelId].isOk ? $t('ai.test.ok') : describeAiError(aiStore.testedModels[item.modelId].code) }}
            </span>
            <button v-if="item.modelId" type="button" class="btn-secondary press" :disabled="aiStore.isSaving || !provider?.hasKey" @click="handleTest(item.modelId)">{{ $t('ai.test.run') }}</button>
          </div>
        </li>
      </ul>
      <p v-if="!provider?.hasKey" class="px-2 pb-2 body-three">{{ $t('ai.models.needsKey') }}</p>
      <p v-if="problem" class="px-2 pb-2 text-sm text-fg-danger" role="alert">{{ problem }}</p>
    </ui-section>

    <section class="flex flex-col gap-2">
      <h2 class="eyebrow">{{ $t('ai.models.catalog') }}</h2>
      <ui-table :columns="columnsComputed" :rows="settings.models" row-key="id" :caption="$t('ai.models.catalog')" :empty-label="$t('ai.models.empty')" />
      <p class="body-three">{{ $t('ai.models.pricesHint') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAiStore } from 'ai/stores/ai';
import { describeAiError } from 'ai/composables/ai-errors';
import { formatUsd } from 'ai/composables/ai-format';
import type { AiFeature, IAiProvider, IAiSettings } from 'ai/types/ai';
import type { ISelectOption } from 'global/types/select';
import type { IUiTableColumn } from 'global/types/table';

import UiSection from 'global/components/ui-section.vue';
import UiSelect from 'global/components/ui-select.vue';
import UiTable from 'global/components/ui-table.vue';
import SparkleLineIcon from 'global/icons/sparkle-line.icon.vue';

// props
const props = defineProps<{ settings: IAiSettings; provider: IAiProvider | null }>();

// stores
const aiStore = useAiStore();
const { t } = useI18n();

// variables
const TRANSCRIPTION_FEATURE: AiFeature = 'assistant_transcription';
const problem = ref<string | null>(null);

// computed
const featureRowsComputed = computed((): { feature: AiFeature; modelId: string | null; options: ISelectOption[] }[] =>
  props.settings.features.map((item) => ({
    feature: item.feature,
    modelId: item.modelId,
    options: props.settings.models
      .filter((model) => !model.isArchived || model.id === item.modelId)
      .filter((model) => (item.feature === TRANSCRIPTION_FEATURE) === isTranscriptionModel(model.name))
      .map((model) => ({ value: model.id, label: model.name })),
  })),
);
const columnsComputed = computed((): IUiTableColumn[] => [
  { key: 'name', label: t('ai.models.model') },
  { key: 'inputPricePerMillion', label: t('ai.models.inputPrice'), isNumeric: true, format: (value) => formatUsd(Number(value)) },
  { key: 'outputPricePerMillion', label: t('ai.models.outputPrice'), isNumeric: true, format: (value) => formatUsd(Number(value)) },
  { key: 'isArchived', label: t('ai.models.state'), format: (value) => t(value ? 'ai.models.archived' : 'ai.models.active') },
]);

// methods
/** Same rule as the backend: a transcription model only hears audio, a chat model only reads text. */
const isTranscriptionModel = (name: string): boolean => name.includes('transcribe') || name.startsWith('whisper');

// event handlers
const handleModel = async (feature: AiFeature, modelId: string | null): Promise<void> => {
  if (!modelId) return;
  problem.value = (await aiStore.saveFeatureModel(feature, modelId)) ? null : describeAiError(aiStore.errorCode);
};
const handleTest = (modelId: string): void => {
  void aiStore.testModel(modelId);
};
</script>
