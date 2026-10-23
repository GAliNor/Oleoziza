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
      <p v-if="clientStore.hasError" class="form-error">{{ $t('client.search.loadError') }}</p>
      <div v-if="clientStore.isLoading && !clientStore.clients.length" class="flex flex-col gap-2">
        <div v-for="index in 4" :key="index" class="skeleton h-16 rounded-2xl" />
      </div>
      <ul v-else class="flex flex-col gap-2">
        <li v-for="client in results" :key="client.id">
          <router-link
            :to="{ name: 'client-page', params: { id: client.id }, query: purpose === 'any' ? {} : { action: purpose } }"
            class="flex min-h-16 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2 transition-colors hover:border-primary-olive-mid"
          >
            <span class="avatar bg-neutral-100 text-neutral-600">{{ initials(client.name) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-neutral-900">{{ client.name }}</span>
              <span class="body-two block truncate">{{ formatPhone(client.phone) }}</span>
            </span>
            <span v-if="client.kind === 'company'" class="chip bg-accent-sand/30 text-accent-brown">{{ $t('client.kinds.company') }}</span>
          </router-link>
        </li>
      </ul>
      <p v-if="query && !results.length && !clientStore.isLoading" class="body-two py-6 text-center">{{ $t('client.search.noResult', { query }) }}</p>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useClientStore } from 'global/stores/client';
import { formatPhone } from 'global/composables/phone';
import type { IClient } from 'global/types/client';

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
const initials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

// lifecycle
onMounted(() => {
  clientStore.fetchClients();
  searchInput.value?.focus();
});
</script>
