<template>
  <app-layout>
    <section class="flex flex-col gap-6">
      <div>
        <h1 class="heading-one">{{ $t('dashboard.title') }}</h1>
        <p class="body-two">{{ $t('dashboard.subtitle') }}</p>
      </div>

      <div class="flex flex-col gap-3">
        <h2 class="heading-two">{{ $t('dashboard.sites') }}</h2>
        <p v-if="siteStore.hasError" class="body-one text-danger-red">{{ $t('dashboard.loadError') }}</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <template v-if="siteStore.isLoading">
            <div v-for="index in 2" :key="index" class="skeleton h-20" />
          </template>
          <article
            v-for="site in siteStore.sites"
            v-else
            :key="site.id"
            class="card flex items-center gap-3"
            :class="{ 'border-primary-olive': site.id === siteStore.currentSiteId }"
          >
            <map-pin-line-icon class="h-6 w-6 text-accent-rust" />
            <div>
              <p class="font-medium text-neutral-800">{{ site.name }}</p>
              <p class="body-two">{{ site.city }}</p>
            </div>
          </article>
        </div>
      </div>

      <p class="body-two">{{ $t('dashboard.dataSource', { source: DATA_SOURCE }) }}</p>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { onMounted } from 'vue';

import { useSiteStore } from 'global/stores/site';
import { DATA_SOURCE } from 'global/services/base';

import AppLayout from 'global/components/app-layout.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// stores
const siteStore = useSiteStore();

// lifecycle
onMounted(() => {
  siteStore.fetchSites();
});
</script>
