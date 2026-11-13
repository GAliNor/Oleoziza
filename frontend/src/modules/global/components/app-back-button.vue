<template>
  <button
    v-if="isShown"
    type="button"
    class="press flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 label text-fg-primary-paragraph
      hover:bg-selected hover:text-fg-brand"
    :aria-label="$t('global.back')"
    @click="handleBack"
  >
    <arrow-left-line-icon class="h-5 w-5 rtl:-scale-x-100" />
    <span class="hidden md:inline">{{ $t('global.back') }}</span>
  </button>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useNavigation } from 'global/composables/use-navigation';
import { HOME_ROUTE_NAME } from 'global/constants/navigation';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// stores
const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const { visibleNavItems, canOpen } = useNavigation();

// computed
/** The Operator has no nav, so every page but its Home is a sub page; in the Backoffice the nav is the way around, so only pages outside it get a back button. */
const isShown = computed((): boolean => {
  if (sessionStore.isOperatorView) return route.name !== HOME_ROUTE_NAME;
  return !visibleNavItems.value.some((item) => item.name === route.name);
});
const parentName = computed((): string => {
  const parent = visibleNavItems.value.find((item) => item.name === route.meta.parent);
  return !sessionStore.isOperatorView && parent && canOpen(parent) ? parent.name : HOME_ROUTE_NAME;
});

// event handlers
const handleBack = async (): Promise<void> => {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  await router.push({ name: parentName.value });
};
</script>
