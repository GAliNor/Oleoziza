<template>
  <div class="flex flex-col gap-2">
    <p class="label">
      {{ label }} <span class="font-normal text-fg-secondary-paragraph">{{ isRequired ? '' : $t('global.photo.optional') }}</span>
    </p>

    <div v-if="modelValue" class="relative overflow-hidden rounded-card bg-subtle">
      <img class="h-52 w-full object-contain" :src="modelValue" :alt="label" />
      <button type="button" class="btn-secondary absolute inset-e-2 bottom-2 min-h-12 bg-surface shadow-raised hover:bg-surface" @click="emit('update:modelValue', null)">
        <close-line-icon class="h-5 w-5" />
        {{ $t('global.photo.remove') }}
      </button>
    </div>

    <div v-else class="grid gap-2" :class="isTouchDevice ? 'grid-cols-2' : 'grid-cols-1'">
      <label v-if="isTouchDevice" class="btn-secondary min-h-14 px-3 has-focus-visible:outline-2 has-focus-visible:outline-focus" :class="{ 'opacity-40': isReading }">
        <camera-line-icon class="h-5 w-5 shrink-0" />
        {{ $t('global.photo.take') }}
        <input class="sr-only" type="file" accept="image/*" capture="environment" :disabled="isReading" @change="handlePick" />
      </label>
      <label class="btn-secondary min-h-14 px-3 has-focus-visible:outline-2 has-focus-visible:outline-focus" :class="{ 'opacity-40': isReading }">
        <image-line-icon class="h-5 w-5 shrink-0" />
        {{ isReading ? $t('global.photo.reading') : $t('global.photo.upload') }}
        <input class="sr-only" type="file" accept="image/*" :disabled="isReading" @change="handlePick" />
      </label>
    </div>

    <p v-if="hasError" class="form-error">{{ $t('global.photo.error') }}</p>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';

import { readPhoto } from 'global/composables/image';

import CameraLineIcon from 'global/icons/camera-line.icon.vue';
import CloseLineIcon from 'global/icons/close-line.icon.vue';
import ImageLineIcon from 'global/icons/image-line.icon.vue';

// props
defineProps<{ modelValue: string | null; label: string; isRequired?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', photo: string | null): void }>();

// variables
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const isReading = ref(false);
const hasError = ref(false);

// event handlers
const handlePick = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  isReading.value = true;
  hasError.value = false;
  try {
    emit('update:modelValue', await readPhoto(file));
  } catch {
    hasError.value = true;
  } finally {
    isReading.value = false;
  }
};
</script>
