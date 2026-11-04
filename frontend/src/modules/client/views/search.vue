<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-lg flex-col gap-3">
      <header class="rise">
        <p class="eyebrow">{{ $t(`client.search.purposes.${purpose}`) }}</p>
        <h1 class="heading-one">{{ $t('client.search.title') }}</h1>
      </header>
      <input
        ref="searchInput"
        v-model="query"
        class="input min-h-14 text-lg"
        type="search"
        autocomplete="off"
        :placeholder="$t('client.search.placeholder')"
      />
      <ui-empty-state v-if="clientStore.hasError" tone="danger" size="compact" :message="$t('client.search.loadError')" />
      <div v-if="clientStore.isLoading && !clientStore.clients.length" class="flex flex-col gap-2">
        <div v-for="index in 4" :key="index" class="skeleton h-16 rounded-card" />
      </div>
      <ul v-else class="flex flex-col gap-2">
        <li v-for="client in results" :key="client.id">
          <router-link
            :to="{ name: 'client-page', params: { id: client.id }, query: purpose === 'any' ? {} : { action: purpose } }"
            class="flex min-h-16 items-center gap-3 rounded-card border border-default bg-surface px-3 py-2 transition-colors hover:border-brand"
          >
            <client-row :client="client" />
          </router-link>
        </li>
      </ul>
      <ui-empty-state v-if="query && !results.length && !clientStore.isLoading" size="compact" :message="$t('client.search.noResult', { query })" />
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useClientStore } from 'client/stores/client';
import type { IClient } from 'client/types/client';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import ClientRow from 'client/components/client-row.vue';
import AppLayout from 'global/components/app-layout.vue';

// stores
const route = useRoute();
const clientStore = useClientStore();

// variables
const PURPOSES = ['withdrawal', 'payment', 'payout'];
const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

// computed
const purpose = computed((): string => (PURPOSES.includes(String(route.query.for)) ? String(route.query.for) : 'any'));
const results = computed((): IClient[] => clientStore.searchClients(query.value, 12));

// methods
// lifecycle
onMounted(() => {
  clientStore.fetchClients();
  searchInput.value?.focus();
});
</script>
