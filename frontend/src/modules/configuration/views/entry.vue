<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">{{ $t('configuration.title') }}</h1>
        <p class="body-two">{{ $t('configuration.subtitle', { scope: scopeName }) }}</p>
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('configuration.readOnly') }}</p>
      <p v-else-if="!isOnline" class="chip self-start bg-warning-subtle text-fg-warning" role="status">{{ $t('configuration.offline') }}</p>

      <ui-empty-state v-if="seasonStore.hasError" class="card" tone="danger" size="compact" :message="$t('configuration.loadError')">
        <template #action>
          <button type="button" class="btn-secondary" @click="load">{{ $t('configuration.retry') }}</button>
        </template>
      </ui-empty-state>
      <template v-else>
        <season-tabs v-model="selectedSeasonId" :can-manage="canManageSeasons" :is-locked="!isOnline || seasonStore.isSaving" @changed="load" />
        <ui-empty-state v-if="!seasonStore.isLoading && !seasonStore.seasons.length" class="card" size="compact" :message="$t('configuration.season.noSeason')" />
        <ui-empty-state v-else-if="configurationStore.hasError" class="card" tone="danger" size="compact" :message="$t('configuration.loadError')">
          <template #action>
            <button type="button" class="btn-secondary" @click="load">{{ $t('configuration.retry') }}</button>
          </template>
        </ui-empty-state>
        <div v-else-if="!selectedSeason || !seasonShown.length" class="flex flex-col gap-3">
          <div class="skeleton h-52 rounded-card" />
          <div class="skeleton h-48 rounded-card" />
        </div>
        <template v-else>
          <season-banner :season="selectedSeason" :configuration="siteStore.isAllSites ? undefined : seasonShown[0].configuration" :can-manage="canManageSeasons" :is-locked="!isOnline || seasonStore.isSaving" />
          <season-price-agenda
            v-for="item in seasonShown"
            :key="item.configuration.siteId"
            :season="selectedSeason"
            :configuration="item.configuration"
            :title="siteStore.isAllSites ? item.name : undefined"
            :is-read-only="siteStore.isAllSites || !isOnline || !siteStore.hasPermission('configuration.manage', item.configuration.siteId)"
          />
        </template>
        <configuration-site
          v-for="item in siteShown"
          :key="item.configuration.siteId"
          class="mt-2"
          :configuration="item.configuration"
          :title="siteStore.isAllSites ? item.name : undefined"
          :is-read-only="siteStore.isAllSites"
        />
        <configuration-notifications v-if="configurationStore.notificationChannels || seasonStore.seasons.length" class="mt-2" />
      </template>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { seasonKey, useConfigurationStore } from 'configuration/stores/configuration';
import { useSeasonStore } from 'season/stores/season';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useLotStore } from 'lot/stores/lot';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { useSiteScope } from 'site/composables/use-site-scope';
import type { IConfiguration } from 'configuration/types/configuration';
import type { ISeason } from 'season/types/season';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import ConfigurationNotifications from 'configuration/components/configuration-notifications.vue';
import ConfigurationSite from 'configuration/components/configuration-site.vue';
import SeasonBanner from 'configuration/components/season-banner.vue';
import SeasonPriceAgenda from 'configuration/components/season-price-agenda.vue';
import SeasonTabs from 'configuration/components/season-tabs.vue';

// stores
const configurationStore = useConfigurationStore();
const seasonStore = useSeasonStore();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const lotStore = useLotStore();
const { scopeName } = useSiteScope();

// variables
const { isOnline } = useOnlineStatus();
const selectedSeasonId = ref<string | null>(null);

// computed
const shownSites = computed((): { id: string; name: string }[] => (siteStore.isAllSites ? siteStore.accessibleSites : siteStore.currentSite ? [siteStore.currentSite] : []));
const selectedSeason = computed((): ISeason | undefined => seasonStore.findSeason(selectedSeasonId.value));
const seasonShown = computed((): { name: string; configuration: IConfiguration }[] =>
  shownSites.value.flatMap((site) => {
    const configuration = selectedSeasonId.value ? configurationStore.bySeason[seasonKey(site.id, selectedSeasonId.value)] : undefined;
    return configuration ? [{ name: site.name, configuration }] : [];
  }),
);
const siteShown = computed((): { name: string; configuration: IConfiguration }[] =>
  shownSites.value.flatMap((site) => {
    const configuration = configurationStore.bySite[site.id];
    return configuration ? [{ name: site.name, configuration }] : [];
  }),
);
const canManageSeasons = computed((): boolean => {
  const session = sessionStore.session;
  return !siteStore.isAllSites && (session?.isOwner === true || Object.values(session?.sites ?? {}).some((permissions) => permissions.includes('season.manage')));
});

// methods
const loadSeasonPrices = (): void => {
  if (selectedSeasonId.value && shownSites.value.length) configurationStore.fetchSeason(shownSites.value.map((site) => site.id), selectedSeasonId.value);
};
const load = async (): Promise<void> => {
  await seasonStore.fetchSeasons();
  const isKnown = seasonStore.seasons.some((season) => season.id === selectedSeasonId.value);
  if (!isKnown) selectedSeasonId.value = (seasonStore.openSeason ?? seasonStore.plannedSeason ?? seasonStore.seasons.at(-1))?.id ?? null;
  loadSeasonPrices();
  if (siteStore.currentSiteId && !siteStore.isAllSites) lotStore.fetchLots(siteStore.currentSiteId);
};

// watchers
watch(() => siteStore.currentSiteId, load, { immediate: true });
watch(selectedSeasonId, loadSeasonPrices);
</script>
