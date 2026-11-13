<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-neutral-900 text-white" role="dialog" aria-modal="true" :aria-label="$t('global.scanner.title')" @keydown.esc="emit('close')">
    <video ref="video" class="absolute inset-0 h-full w-full object-cover" playsinline muted />
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div class="scanner-frame aspect-square w-[min(72vw,18rem)] rounded-[1.75rem]" />
    </div>

    <header class="relative flex items-center justify-between gap-3 p-4">
      <h2 class="heading-five text-white">{{ $t('global.scanner.title') }}</h2>
      <button ref="closeButton" type="button" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur" :aria-label="$t('global.scanner.close')" @click="emit('close')">
        <close-line-icon class="h-5 w-5" />
      </button>
    </header>

    <p class="relative mx-auto mt-auto mb-10 max-w-xs rounded-full bg-neutral-900/60 px-4 py-2 text-center text-sm backdrop-blur" role="status">
      {{ $t(`global.scanner.status.${status}`) }}
    </p>
  </div>
</template>

<script setup lang="ts">
// imports
import { onMounted, useTemplateRef } from 'vue';

import { useQrScanner } from 'global/composables/use-qr-scanner';

import CloseLineIcon from 'global/icons/close-line.icon.vue';

// emits
const emit = defineEmits<{
  (event: 'read', text: string): void;
  (event: 'close'): void;
}>();

// variables
const video = useTemplateRef<HTMLVideoElement>('video');
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton');
const { status, start } = useQrScanner(video, (text) => emit('read', text));

// lifecycle
onMounted(() => {
  closeButton.value?.focus();
  start();
});
</script>

<style scoped>
.scanner-frame {
  box-shadow: 0 0 0 100vmax color-mix(in srgb, var(--color-neutral-900) 45%, transparent);
  outline: 3px solid color-mix(in srgb, var(--color-white) 90%, transparent);
  outline-offset: -3px;
}
</style>
