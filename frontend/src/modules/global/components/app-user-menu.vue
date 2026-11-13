<template>
  <div ref="root" class="relative shrink-0" @focusout="handleFocusOut" @keydown.esc="isOpen = false">
    <button
      v-if="$slots.trigger"
      type="button"
      class="flex min-h-11 min-w-0 items-center gap-2 rounded-control border border-default bg-surface pe-3 ps-1 label"
      :aria-label="triggerLabel ?? $t('global.shell.menu')"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="isOpen = !isOpen"
    >
      <slot name="trigger" />
      <chevron-down-line-icon class="h-4 w-4 shrink-0 text-fg-secondary-paragraph" />
    </button>
    <button v-else type="button" class="icon-btn" :aria-label="$t('global.shell.menu')" :aria-expanded="isOpen" aria-haspopup="true" @click="isOpen = !isOpen">
      <more-line-icon class="h-5 w-5" />
    </button>
    <div v-if="isOpen" class="absolute inset-e-0 top-full z-50 mt-2 flex min-w-52 flex-col gap-1 rounded-card border border-default bg-surface p-2 shadow-overlay">
      <slot />
      <router-link
        :to="{ name: 'auth-change-credential', query: { redirect: route.fullPath } }"
        class="inline-flex min-h-11 w-full items-center gap-2 rounded-control px-3 label hover:bg-subtle"
        @click="isOpen = false"
      >
        <lock-line-icon class="h-5 w-5 shrink-0" />
        {{ $t('auth.changeCredential.menu') }}
      </router-link>
      <ui-language-switch class="w-full" />
      <button type="button" class="inline-flex min-h-11 w-full items-center gap-2 rounded-control px-3 label hover:bg-subtle" @click="emit('logout')">
        <logout-line-icon class="h-5 w-5 shrink-0" />
        {{ $t('auth.logout') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';
import { useRoute } from 'vue-router';

import UiLanguageSwitch from 'global/components/ui-language-switch.vue';
import ChevronDownLineIcon from 'global/icons/chevron-down-line.icon.vue';
import LockLineIcon from 'global/icons/lock-line.icon.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import MoreLineIcon from 'global/icons/more-line.icon.vue';

// props
defineProps<{ triggerLabel?: string }>();
defineSlots<{ default?: () => unknown; trigger?: () => unknown }>();

// emits
const emit = defineEmits<{ (event: 'logout'): void }>();

// stores
const route = useRoute();

// variables
const root = ref<HTMLElement | null>(null);
const isOpen = ref(false);

// event handlers
const handleFocusOut = (event: FocusEvent): void => {
  if (!root.value?.contains(event.relatedTarget as Node | null)) isOpen.value = false;
};
</script>
