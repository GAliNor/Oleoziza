<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header class="rise">
        <p class="eyebrow">{{ siteName }}</p>
        <h1 class="heading-one">{{ $t('reception.weigh.title') }}</h1>
        <p class="body-two">{{ $t('reception.weigh.subtitle', receptionStore.receivedLots.length) }}</p>
      </header>

      <div v-if="receptionStore.isLoading && !receptionStore.receivedLots.length" class="flex flex-col gap-2">
        <div v-for="index in 3" :key="index" class="skeleton h-20 rounded-2xl" />
      </div>

      <ul v-else class="stagger grid gap-2 md:grid-cols-2">
        <li v-for="lot in receptionStore.receivedLots" :key="lot.id">
          <router-link
            :to="{ name: 'reception-station', params: { code: lot.code } }"
            class="card lift flex min-h-20 items-center gap-3 hover:border-primary-olive-mid"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-neutral-900">{{ lot.clientName }}</span>
              <span class="body-two block truncate">{{ lot.code }} · {{ lot.variety }} · {{ formatTime(lot.receivedAt) }}</span>
              <span v-if="lot.isPendingSync" class="chip mt-1 bg-warning-amber/15 text-warning-amber">{{ $t('reception.pendingSync') }}</span>
            </span>
            <span class="text-right">
              <span class="block text-lg font-semibold text-neutral-900 tabular-nums">{{ formatKg(lot.netKg) }}</span>
              <span class="body-two block">{{ $t('reception.station.weighings', lot.weighings.length) }}</span>
            </span>
          </router-link>
        </li>
      </ul>

      <div v-if="!receptionStore.isLoading && !receptionStore.receivedLots.length" class="flex flex-col items-center gap-4 py-12 text-center">
        <p class="body-one">{{ $t('reception.weigh.empty') }}</p>
        <router-link v-can="'reception.create'" :to="{ name: 'reception-new' }" class="btn-primary">{{ $t('reception.done.again') }}</router-link>
      </div>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';

import { useSiteStore } from 'global/stores/site';
import { useReceptionStore } from 'reception/stores/reception';
import { formatKg, formatTime } from 'reception/composables/format';

import AppLayout from 'global/components/app-layout.vue';

// stores
const siteStore = useSiteStore();
const receptionStore = useReceptionStore();

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
