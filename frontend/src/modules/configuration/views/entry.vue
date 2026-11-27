<template>
  <app-layout>
    <section v-if="isOwnerComputed" class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 pb-10">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">{{ $t('configuration.title') }}</h1>
        <p class="body-two">{{ $t('configuration.hub.subtitle') }}</p>
      </header>
      <div class="stagger grid gap-4 md:grid-cols-2">
        <configuration-hub-card
          :to="{ name: 'configuration-settings' }"
          :icon="SlidersLineIcon"
          :title="$t('configuration.hub.settings.title')"
          :description="$t('configuration.hub.settings.description')"
          :items="settingsItemsComputed"
        />
        <configuration-hub-card :to="{ name: 'ai' }" :icon="SparkleLineIcon" :title="$t('ai.title')" :description="$t('configuration.hub.ai.description')" :items="aiItemsComputed" :status="aiStatusComputed" />
      </div>
    </section>
    <configuration-settings v-else :title="$t('configuration.title')" />
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAiStore } from 'ai/stores/ai';
import { formatUsd } from 'ai/composables/ai-format';
import { useSessionStore } from 'global/stores/session';

import AppLayout from 'global/components/app-layout.vue';
import ConfigurationHubCard from 'configuration/components/configuration-hub-card.vue';
import ConfigurationSettings from 'configuration/components/configuration-settings.vue';
import SlidersLineIcon from 'global/icons/sliders-line.icon.vue';
import SparkleLineIcon from 'global/icons/sparkle-line.icon.vue';

// stores
const sessionStore = useSessionStore();
const aiStore = useAiStore();
const { t } = useI18n();

// variables
const SETTINGS_ITEMS = ['season', 'prices', 'equipment', 'payments', 'notifications'];
const AI_ITEMS = ['monitoring', 'access', 'models'];

// computed
/** Only an Owner sees the two doors; anyone else with configuration.manage lands straight on the settings. */
const isOwnerComputed = computed((): boolean => sessionStore.session?.isOwner === true);
const settingsItemsComputed = computed((): string[] => SETTINGS_ITEMS.map((key) => t(`configuration.hub.settings.items.${key}`)));
const aiItemsComputed = computed((): string[] => AI_ITEMS.map((key) => t(`ai.tabs.${key}`)));
const aiStatusComputed = computed((): string | undefined => {
  const provider = aiStore.provider;
  if (!provider) return undefined;
  if (!provider.hasKey) return t('configuration.hub.ai.noKey');
  return t('configuration.hub.ai.status', { lastFour: provider.keyLastFour, spent: formatUsd(provider.spentThisMonthUsd), budget: formatUsd(provider.monthlyBudgetUsd) });
});

// lifecycle
onMounted(() => {
  if (isOwnerComputed.value) void aiStore.fetchSettings();
});
</script>
