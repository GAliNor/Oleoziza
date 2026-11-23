<template>
  <ui-empty-state class="card" tone="danger" size="compact" :message="$t('season.noSeason.title')">
    <template #action>
      <div class="flex flex-col items-center gap-3">
        <p class="body-two max-w-prose text-center">{{ $t(`season.noSeason.${canOpenComputed ? 'manage' : 'ask'}.${action}`) }}</p>
        <router-link v-if="canOpenComputed" class="btn-primary" :to="{ name: 'configuration' }">{{ $t('season.noSeason.open') }}</router-link>
      </div>
    </template>
  </ui-empty-state>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useSessionStore } from 'global/stores/session';

import UiEmptyState from 'global/components/ui-empty-state.vue';

// props
/** What can't be done meanwhile. */
defineProps<{ action: 'reception' | 'payment' }>();

// stores
const sessionStore = useSessionStore();

// computed
const canOpenComputed = computed((): boolean => sessionStore.session?.isOwner === true || Object.values(sessionStore.session?.sites ?? {}).some((permissions) => permissions.includes('season.manage')));
</script>
