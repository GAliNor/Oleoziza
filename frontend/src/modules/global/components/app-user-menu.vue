<template>
  <div ref="root" class="relative shrink-0" @focusout="handleFocusOut" @keydown.esc="isOpen = false">
    <button type="button" class="icon-btn" :aria-label="$t('global.shell.menu')" :aria-expanded="isOpen" aria-haspopup="true" @click="isOpen = !isOpen">
      <more-line-icon class="h-5 w-5" />
    </button>
    <div v-if="isOpen" class="absolute inset-e-0 top-full z-50 mt-2 flex min-w-52 flex-col gap-1 rounded-card border border-default bg-surface p-2 shadow-overlay">
      <slot />
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

import UiLanguageSwitch from 'global/components/ui-language-switch.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import MoreLineIcon from 'global/icons/more-line.icon.vue';

// emits
const emit = defineEmits<{ (event: 'logout'): void }>();

// variables
const root = ref<HTMLElement | null>(null);
const isOpen = ref(false);

// event handlers
const handleFocusOut = (event: FocusEvent): void => {
  if (!root.value?.contains(event.relatedTarget as Node | null)) isOpen.value = false;
};
</script>
