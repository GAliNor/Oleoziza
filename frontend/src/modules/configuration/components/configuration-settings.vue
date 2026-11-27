<template>
  <section ref="page" class="@container mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 pb-10">
    <header class="rise flex flex-col gap-1">
      <h1 class="heading-one">{{ title }}</h1>
      <p class="body-two">{{ $t('configuration.subtitle', { scope: scopeName }) }}</p>
    </header>
    <ui-slide :is-away="isRemoving">
      <div class="flex flex-col gap-6">
        <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('configuration.readOnly') }}</p>
        <p v-else-if="!isOnline" class="chip self-start bg-warning-subtle text-fg-warning" role="status">{{ $t('configuration.offline') }}</p>

        <ui-empty-state v-if="seasonStore.hasError || configurationStore.hasError" class="card" tone="danger" size="compact" :message="$t('configuration.loadError')">
          <template #action>
            <button type="button" class="btn-secondary" @click="load">{{ $t('configuration.retry') }}</button>
          </template>
        </ui-empty-state>
        <template v-else>
          <div class="flex flex-col gap-4">
            <season-tabs v-model="selectedSeasonId" :can-manage="canManageSeasons" :is-locked="isSeasonLocked" />
            <ui-empty-state v-if="!seasonStore.isLoading && !seasonStore.seasons.length" class="card" size="compact" :message="$t('configuration.season.noSeason')" />
            <div v-else-if="!selectedSeason" class="skeleton h-52 rounded-card" />
            <Transition v-else name="tab-switch" mode="out-in">
              <div :key="selectedSeason.id" class="flex flex-col gap-4">
                <season-banner :season="selectedSeason" :can-manage="canManageSeasons" :is-locked="isSeasonLocked" />
                <season-properties :season="selectedSeason" :can-manage="canManageSeasons" :is-locked="isSeasonLocked" @changed="loadSeasonPrices" @remove="handleRemove" />
              </div>
            </Transition>
          </div>

          <configuration-site
            v-for="site in shownSites"
            :key="site.id"
            :site-id="site.id"
            :title="siteStore.isAllSites ? site.name : undefined"
            :season="selectedSeason"
            :prices="selectedSeasonId ? configurationStore.bySeason[seasonKey(site.id, selectedSeasonId)] : undefined"
            :settings="configurationStore.bySite[site.id]"
          />
          <configuration-notifications v-if="configurationStore.notificationChannels" />
        </template>
      </div>
      <template #away>
        <season-removal v-if="selectedSeason" :season="selectedSeason" @cancel="isRemoving = false" @deleted="handleDeleted" />
      </template>
    </ui-slide>
  </section>
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
import type { ISeason } from 'season/types/season';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSlide from 'global/components/ui-slide.vue';
import ConfigurationNotifications from 'configuration/components/configuration-notifications.vue';
import ConfigurationSite from 'configuration/components/configuration-site.vue';
import SeasonBanner from 'configuration/components/season-banner.vue';
import SeasonProperties from 'configuration/components/season-properties.vue';
import SeasonRemoval from 'configuration/components/season-removal.vue';
import SeasonTabs from 'configuration/components/season-tabs.vue';

// props
defineProps<{ title: string }>();

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
const page = ref<HTMLElement | null>(null);
/** Deleting the shown Season takes the whole page, slid in over the settings. */
const isRemoving = ref(false);

// computed
const shownSites = computed((): { id: string; name: string }[] => (siteStore.isAllSites ? siteStore.accessibleSites : siteStore.currentSite ? [siteStore.currentSite] : []));
const selectedSeason = computed((): ISeason | undefined => seasonStore.findSeason(selectedSeasonId.value));
const isSeasonLocked = computed((): boolean => !isOnline.value || seasonStore.isSaving);
const canManageSeasons = computed((): boolean => {
  const session = sessionStore.session;
  return !siteStore.isAllSites && (session?.isOwner === true || Object.values(session?.sites ?? {}).some((permissions) => permissions.includes('season.manage')));
});

// methods
const pickSeason = (): void => {
  if (seasonStore.seasons.some((season) => season.id === selectedSeasonId.value)) return;
  selectedSeasonId.value = (seasonStore.openSeason ?? seasonStore.plannedSeason ?? seasonStore.seasons.at(-1))?.id ?? null;
};

/** The shown Season's prices, and the settings that belong to no Season even when none exists. */
const loadSeasonPrices = (): void => {
  const siteIds = shownSites.value.map((site) => site.id);
  if (!siteIds.length) return;
  if (selectedSeasonId.value) configurationStore.fetchSeason(siteIds, selectedSeasonId.value);
  else configurationStore.fetchSites(siteIds);
};

const load = async (): Promise<void> => {
  isRemoving.value = false;
  await seasonStore.fetchSeasons();
  pickSeason();
  loadSeasonPrices();
  if (siteStore.currentSiteId && !siteStore.isAllSites) lotStore.fetchLots(siteStore.currentSiteId);
};

// watchers
watch(() => siteStore.currentSiteId, load, { immediate: true });
watch(selectedSeasonId, loadSeasonPrices);

// event handlers
const handleRemove = (): void => {
  isRemoving.value = true;
  if ((page.value?.getBoundingClientRect().top ?? 0) < 0) page.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
};

const handleDeleted = (): void => {
  isRemoving.value = false;
  selectedSeasonId.value = null;
  pickSeason();
};
</script>
