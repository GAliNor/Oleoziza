<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">{{ $t('lot.discount.title') }}</h1>
        <p class="body-two">{{ $t('lot.discount.subtitle', { scope: scopeName, count: lotStore.pendingDiscountLots.length }, lotStore.pendingDiscountLots.length) }}</p>
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('lot.discount.readOnly') }}</p>
      <p v-else-if="!isOnline" class="chip self-start bg-warning-subtle text-fg-warning" role="status">{{ $t('lot.discount.offline') }}</p>

      <ui-empty-state v-if="lotStore.hasError" class="card" tone="danger" size="compact" :message="$t('lot.discount.loadError')">
        <template #action>
          <button type="button" class="btn-secondary" @click="load(true)">{{ $t('lot.discount.retry') }}</button>
        </template>
      </ui-empty-state>
      <div v-else-if="lotStore.isLoading" class="flex flex-col gap-3">
        <div v-for="index in 2" :key="index" class="skeleton h-48 rounded-card" />
      </div>
      <ui-empty-state v-else-if="!lotStore.pendingDiscountLots.length" size="page" :message="$t('lot.discount.empty')" />
      <ul v-else class="stagger flex flex-col gap-3">
        <li v-for="lot in lotStore.pendingDiscountLots" :key="lot.id">
          <discount-card :lot="lot" :is-read-only="siteStore.isAllSites" :is-online="isOnline" />
        </li>
      </ul>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { watch } from 'vue';

import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { useSiteScope } from 'site/composables/use-site-scope';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import DiscountCard from 'lot/components/discount-card.vue';

// stores
const lotStore = useLotStore();
const siteStore = useSiteStore();
const { scopeName } = useSiteScope();

// variables
const { isOnline } = useOnlineStatus();

// methods
const load = (isForced = false): void => {
  if (siteStore.currentSiteId) lotStore.fetchLots(siteStore.currentSiteId, isForced);
};

// watchers
watch(() => siteStore.currentSiteId, () => load(), { immediate: true });
</script>
