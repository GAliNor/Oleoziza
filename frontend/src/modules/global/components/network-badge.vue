<template>
  <span v-if="!isOnline" class="chip bg-accent-gold text-neutral-800" role="status">
    <wifi-off-line-icon class="h-3.5 w-3.5" />
    {{ $t('global.network.offline') }}
  </span>
</template>

<script setup lang="ts">
// imports
import { useOnlineStatus } from 'global/composables/use-online-status';

import WifiOffLineIcon from 'global/icons/wifi-off-line.icon.vue';

// variables
const { isOnline } = useOnlineStatus();
</script>
