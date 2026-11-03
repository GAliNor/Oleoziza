<template>
  <div class="fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6" aria-live="polite">
    <transition-group name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="glass-card flex w-full max-w-sm items-start gap-3 py-3"
        :class="TONE_CLASSES[toast.tone]"
        role="status"
      >
        <p class="flex-1 text-sm">{{ toast.message }}</p>
        <button
          type="button"
          class="text-fg-secondary-paragraph hover:text-fg-default"
          :aria-label="$t('global.toast.close')"
          @click="handleDismiss(toast.id)"
        >
          <close-line-icon class="h-4 w-4" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
// imports
import { useToastStore } from 'global/stores/toast';
import type { ToastTone } from 'global/types/toast';

import CloseLineIcon from 'global/icons/close-line.icon.vue';

// stores
const toastStore = useToastStore();

// variables
const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-info-subtle',
  success: 'border-success-subtle',
  danger: 'border-danger-subtle text-fg-danger',
  dev: 'border-dashed border-accent bg-accent-subtle text-fg-accent',
};

// event handlers
const handleDismiss = (id: number): void => {
  toastStore.dismiss(id);
};
</script>
