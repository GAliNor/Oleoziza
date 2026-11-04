<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header class="rise">
        <p class="eyebrow">{{ siteName }}</p>
        <h1 class="heading-one">{{ $t('reception.weigh.title') }}</h1>
        <p class="body-two">{{ $t('reception.weigh.subtitle', lotStore.receivedLots.length) }}</p>
      </header>

      <div v-if="receptionStore.isLoading && !lotStore.receivedLots.length" class="flex flex-col gap-2">
        <div v-for="index in 3" :key="index" class="skeleton h-20 rounded-2xl" />
      </div>

      <ul v-else class="stagger grid gap-2 md:grid-cols-2">
        <li v-for="lot in lotStore.receivedLots" :key="lot.id">
          <router-link
            :to="{ name: 'reception-station', params: { code: lot.code } }"
            class="card lift flex min-h-20 items-center gap-3 hover:border-brand"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-fg-display">{{ lot.clientName }}</span>
              <span class="body-two block truncate">{{ lot.code }} · {{ lot.variety }} · {{ formatTime(lot.receivedAt) }}</span>
              <span v-if="lot.isPendingSync" class="chip mt-1 bg-warning-subtle text-fg-warning">{{ $t('reception.pendingSync') }}</span>
            </span>
            <span class="text-right">
              <span class="block text-lg figure text-fg-display">{{ formatKg(lot.netKg) }}</span>
              <span class="body-two block">{{ $t('reception.station.weighings', lot.weighings.length) }}</span>
            </span>
          </router-link>
        </li>
      </ul>

      <ui-empty-state v-if="!receptionStore.isLoading && !lotStore.receivedLots.length" size="page" :message="$t('reception.weigh.empty')">
        <template #action>
          <router-link v-can="'reception.create'" :to="{ name: 'reception-new' }" class="btn-primary">{{ $t('reception.done.again') }}</router-link>
        </template>
      </ui-empty-state>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';

import { useSiteStore } from 'site/stores/site';
import { useReceptionStore } from 'reception/stores/reception';
import { useLotStore } from 'lot/stores/lot';
import { formatKg } from 'lot/composables/quantity';
import { formatTime } from 'global/composables/date';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import AppLayout from 'global/components/app-layout.vue';

// stores
const siteStore = useSiteStore();
const receptionStore = useReceptionStore();
const lotStore = useLotStore();

// computed
const siteName = computed((): string => siteStore.currentSite?.city ?? '');

// watchers
watch(
  () => siteStore.currentSite?.id,
  (siteId) => {
    if (siteId) receptionStore.fetchSite(siteId);
  },
  { immediate: true },
);
</script>
