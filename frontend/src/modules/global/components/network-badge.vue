<template>
  <span
    class="chip"
    :class="isOnline ? 'bg-primary-olive-light text-primary-olive-dark' : 'bg-accent-gold text-neutral-800'"
    role="status"
  >
    <component :is="isOnline ? WifiLineIcon : WifiOffLineIcon" class="h-3.5 w-3.5" />
    {{ isOnline ? $t('global.network.online') : $t('global.network.offline') }}
  </span>
</template>

<script setup lang="ts">
// imports
import { useOnlineStatus } from 'global/composables/use-online-status';

import WifiLineIcon from 'global/icons/wifi-line.icon.vue';
import WifiOffLineIcon from 'global/icons/wifi-off-line.icon.vue';

// variables
const { isOnline } = useOnlineStatus();
</script>
