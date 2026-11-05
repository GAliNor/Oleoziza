<template>
  <div v-if="siteStore.accessibleSites.length" class="flex min-w-0 items-center gap-2">
    <map-pin-line-icon class="h-5 w-5 shrink-0 text-fg-place" />
    <span v-if="!hasChoice" class="truncate label">
      {{ siteStore.currentSite?.name }}
    </span>
    <div v-else class="relative min-w-0">
      <label class="sr-only" for="site-switcher">{{ $t('global.site.label') }}</label>
      <select
        id="site-switcher"
        class="w-full appearance-none truncate rounded-lg border border-default bg-surface py-1.5 pe-8 ps-3 label
          focus-visible:outline-2 focus-visible:outline-focus"
        :value="siteStore.currentSiteId ?? ''"
        @change="handleChange"
      >
        <option v-for="site in siteStore.accessibleSites" :key="site.id" :value="site.id">{{ site.name }}</option>
        <option v-if="siteStore.canSelectAll" :value="ALL_SITES">{{ $t('global.site.all') }}</option>
      </select>
      <chevron-down-line-icon
        class="pointer-events-none absolute top-1/2 inset-e-2 h-4 w-4 -translate-y-1/2 text-fg-secondary-paragraph"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useSiteStore } from 'site/stores/site';
import { ALL_SITES } from 'site/constants/site';

import ChevronDownLineIcon from 'global/icons/chevron-down-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// stores
const siteStore = useSiteStore();

// computed
const hasChoice = computed((): boolean => siteStore.accessibleSites.length > 1);

// event handlers
const handleChange = (event: Event): void => {
  siteStore.selectSite((event.target as HTMLSelectElement).value);
};
</script>
