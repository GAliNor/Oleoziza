<template>
  <button
    v-if="isShown"
    type="button"
    class="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-neutral-700 transition-colors
      hover:bg-primary-olive-light hover:text-primary-olive-dark"
    :aria-label="$t('global.back')"
    @click="handleBack"
  >
    <arrow-left-line-icon class="h-5 w-5" />
    <span class="hidden md:inline">{{ $t('global.back') }}</span>
  </button>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { HOME_ROUTE_NAME } from 'global/constants/navigation';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// stores
const route = useRoute();
const router = useRouter();

// computed
const isShown = computed((): boolean => route.name !== HOME_ROUTE_NAME);

// event handlers
const handleBack = async (): Promise<void> => {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  await router.push({ name: HOME_ROUTE_NAME });
};
</script>
