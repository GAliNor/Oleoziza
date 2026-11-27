<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 pb-10">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">{{ $t('ai.title') }}</h1>
        <p class="body-two">{{ $t('ai.subtitle') }}</p>
      </header>

      <ui-segmented class="rise self-start" :model-value="tabComputed" :options="tabOptionsComputed" variant="strong-pills" :label="$t('ai.tabsLabel')" @update:model-value="handleTab" />

      <ui-empty-state v-if="aiStore.hasError && !aiStore.settings" class="card" tone="danger" size="compact" :message="$t('ai.loadError')">
        <template #action>
          <button type="button" class="btn-secondary" @click="handleRetry">{{ $t('ai.retry') }}</button>
        </template>
      </ui-empty-state>
      <div v-else-if="!aiStore.settings && tabComputed !== 'monitoring'" class="flex flex-col gap-3" role="status">
        <span class="sr-only">{{ $t('ai.loading') }}</span>
        <div v-for="index in 3" :key="index" class="skeleton h-16 rounded-card" />
      </div>
      <Transition v-else name="tab-switch" mode="out-in">
        <ai-monitoring-tab v-if="tabComputed === 'monitoring'" key="monitoring" />
        <ai-access-tab v-else-if="tabComputed === 'access' && aiStore.settings" key="access" :settings="aiStore.settings" :provider="aiStore.provider" />
        <ai-models-tab v-else-if="aiStore.settings" key="models" :settings="aiStore.settings" :provider="aiStore.provider" />
      </Transition>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAiStore } from 'ai/stores/ai';
import type { AiTab } from 'ai/types/ai';

import AiAccessTab from 'ai/components/ai-access-tab.vue';
import AiModelsTab from 'ai/components/ai-models-tab.vue';
import AiMonitoringTab from 'ai/components/ai-monitoring-tab.vue';
import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';

// stores
const aiStore = useAiStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

// variables
const TABS: AiTab[] = ['monitoring', 'access', 'models'];
const DEFAULT_TAB: AiTab = 'monitoring';

// computed
const tabComputed = computed((): AiTab => {
  const key = String(route.query.tab ?? DEFAULT_TAB);
  return TABS.includes(key as AiTab) ? (key as AiTab) : DEFAULT_TAB;
});
const tabOptionsComputed = computed((): { key: AiTab; label: string }[] => TABS.map((key) => ({ key, label: t(`ai.tabs.${key}`) })));

// event handlers
const handleTab = (key: AiTab): void => {
  void router.replace({ query: { ...route.query, tab: key === DEFAULT_TAB ? undefined : key } });
};
const handleRetry = (): void => {
  void aiStore.fetchSettings();
};

// lifecycle
onMounted(() => void aiStore.fetchSettings());
</script>
