<template>
  <div
    v-if="needRefresh"
    class="fixed inset-x-4 bottom-20 z-50 flex flex-col gap-3 card md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm"
    role="alert"
  >
    <p class="body-one">{{ $t('global.update.available') }}</p>
    <div class="flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="handleDismiss">{{ $t('global.update.dismiss') }}</button>
      <button type="button" class="btn-primary" @click="handleReload">{{ $t('global.update.reload') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { useRegisterSW } from 'virtual:pwa-register/vue';

// variables
const { needRefresh, updateServiceWorker } = useRegisterSW();

// event handlers
const handleReload = async (): Promise<void> => {
  await updateServiceWorker(true);
};

const handleDismiss = (): void => {
  needRefresh.value = false;
};
</script>
