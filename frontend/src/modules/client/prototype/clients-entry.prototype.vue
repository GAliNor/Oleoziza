<template>
  <app-layout v-if="authStore.session?.role === 'management'">
    <clients-page-prototype />
  </app-layout>
  <search-view v-else />
</template>

<script setup lang="ts">
// PROTOTYPE — /clients opens the Management Clients page for Management and the Client search for Operators (ticket 0030).
// imports
import { useAuthStore } from 'auth/stores/auth';

import AppLayout from 'global/components/app-layout.vue';
import ClientsPagePrototype from 'client/prototype/clients-page.prototype.vue';
import SearchView from 'client/views/search.vue';

// stores
const authStore = useAuthStore();
</script>
