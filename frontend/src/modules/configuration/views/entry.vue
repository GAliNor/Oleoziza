<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">{{ $t('configuration.title') }}</h1>
        <p class="body-two">{{ $t('configuration.subtitle', { scope: scopeName }) }}</p>
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('configuration.readOnly') }}</p>
      <p v-else-if="!isOnline" class="chip self-start bg-warning-subtle text-fg-warning" role="status">{{ $t('configuration.offline') }}</p>

      <ui-empty-state v-if="configurationStore.hasError" class="card" tone="danger" size="compact" :message="$t('configuration.loadError')">
        <template #action>
          <button type="button" class="btn-secondary" @click="load">{{ $t('configuration.retry') }}</button>
        </template>
      </ui-empty-state>
      <div v-else-if="!shown.length" class="grid gap-3 lg:grid-cols-2">
        <div v-for="index in 4" :key="index" class="skeleton h-40 rounded-card" />
      </div>
      <configuration-site
        v-for="item in shown"
        v-else
        :key="item.configuration.siteId"
        :configuration="item.configuration"
        :title="siteStore.isAllSites ? item.name : undefined"
        :is-read-only="siteStore.isAllSites"
      />
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useSiteStore } from 'site/stores/site';
import { useLotStore } from 'lot/stores/lot';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { useSiteScope } from 'site/composables/use-site-scope';
import type { IConfiguration } from 'configuration/types/configuration';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import ConfigurationSite from 'configuration/components/configuration-site.vue';

// stores
const configurationStore = useConfigurationStore();
const siteStore = useSiteStore();
const lotStore = useLotStore();
const { scopeName } = useSiteScope();

// variables
const { isOnline } = useOnlineStatus();

// computed
const shownSites = computed((): { id: string; name: string }[] => (siteStore.isAllSites ? siteStore.accessibleSites : siteStore.currentSite ? [siteStore.currentSite] : []));
const shown = computed((): { name: string; configuration: IConfiguration }[] =>
  shownSites.value.flatMap((site) => {
    const configuration = configurationStore.bySite[site.id];
    return configuration ? [{ name: site.name, configuration }] : [];
  }),
);

// methods
const load = (): void => {
  configurationStore.fetchSites(shownSites.value.map((site) => site.id));
  if (siteStore.currentSiteId && !siteStore.isAllSites) lotStore.fetchLots(siteStore.currentSiteId);
};

// watchers
watch(() => siteStore.currentSiteId, load, { immediate: true });
</script>
