<template>
  <app-layout v-if="sessionStore.isBackofficeView">
    <client-register />
  </app-layout>
  <search-view v-else />
</template>

<script setup lang="ts">
// imports
import { useSessionStore } from 'global/stores/session';

import AppLayout from 'global/components/app-layout.vue';
import ClientRegister from 'client/components/client-register.vue';
import SearchView from 'client/views/search.vue';

// stores
const sessionStore = useSessionStore();
</script>
