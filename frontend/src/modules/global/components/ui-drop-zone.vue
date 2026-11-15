<template>
  <div
    class="drop-zone group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-4 py-6 text-center transition-[border-color,background-color,transform] duration-300 ease-(--ease-premium) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    :class="[isOver ? 'scale-[1.01] border-brand bg-selected/40' : 'border-default bg-page/60 hover:border-strong hover:bg-selected/20', { 'pointer-events-none opacity-60': isDisabled }]"
    role="button"
    :tabindex="isDisabled ? -1 : 0"
    :aria-label="$t(isTouchDevice ? 'global.dropZone.titleTouch' : 'global.dropZone.title')"
    :aria-disabled="isDisabled || undefined"
    @click="handleOpenPicker"
    @keydown.enter.prevent="handleOpenPicker"
    @keydown.space.prevent="handleOpenPicker"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <span
      class="grid h-12 w-12 place-items-center rounded-card bg-surface text-fg-brand shadow-raised transition-transform duration-300 ease-(--ease-spring) group-hover:-translate-y-0.5"
      :class="{ '-translate-y-1': isOver }"
    >
      <image-line-icon class="h-6 w-6" />
    </span>
    <div class="flex flex-col gap-0.5">
      <p class="font-medium text-fg-display">{{ isOver ? $t('global.dropZone.release') : $t(isTouchDevice ? 'global.dropZone.titleTouch' : 'global.dropZone.title') }}</p>
      <p class="body-three">{{ hint ?? $t('global.dropZone.hint') }}</p>
    </div>
    <div class="flex flex-wrap justify-center gap-2">
      <label v-if="isTouchDevice" class="btn-primary min-h-11 px-4 has-focus-visible:outline-2 has-focus-visible:outline-focus" @click.stop @keydown.stop>
        <camera-line-icon class="h-5 w-5 shrink-0" />
        {{ $t('global.dropZone.take') }}
        <input class="sr-only" type="file" accept="image/*" capture="environment" :disabled="isDisabled" @change="handlePick" />
      </label>
      <span class="btn-secondary pointer-events-none min-h-11 px-4" aria-hidden="true">{{ $t('global.dropZone.browse') }}</span>
    </div>
    <input ref="fileInput" class="sr-only" type="file" tabindex="-1" :accept="accept" :multiple="isMultiple" :disabled="isDisabled" @click.stop @change="handlePick" />
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';

import CameraLineIcon from 'global/icons/camera-line.icon.vue';
import ImageLineIcon from 'global/icons/image-line.icon.vue';

// props
const props = withDefaults(defineProps<{ accept?: string; isMultiple?: boolean; isDisabled?: boolean; hint?: string }>(), {
  accept: 'image/*,application/pdf',
  isMultiple: true,
  isDisabled: false,
  hint: undefined,
});

// emits
const emit = defineEmits<{ (event: 'files', files: File[]): void }>();

// variables
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
const isOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
let dragDepth = 0;

// methods
/** Keeps only the files the zone accepts, as the file picker would. */
const acceptedFiles = (files: File[]): File[] => {
  const rules = props.accept.split(',').map((rule) => rule.trim());
  return files.filter((file) => rules.some((rule) => (rule.endsWith('/*') ? file.type.startsWith(rule.slice(0, -1)) : file.type === rule)));
};

// event handlers
const handleOpenPicker = (): void => {
  if (!props.isDisabled) fileInput.value?.click();
};

const handleDragEnter = (): void => {
  dragDepth += 1;
  isOver.value = true;
};

const handleDragLeave = (): void => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) isOver.value = false;
};

const handleDrop = (event: DragEvent): void => {
  dragDepth = 0;
  isOver.value = false;
  const files = acceptedFiles([...(event.dataTransfer?.files ?? [])]);
  if (files.length) emit('files', props.isMultiple ? files : files.slice(0, 1));
};

const handlePick = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  if (files.length) emit('files', files);
};
</script>
