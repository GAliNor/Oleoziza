<template>
  <li class="relative">
    <span class="absolute top-2 -left-[27px] h-3 w-3 rounded-full bg-primary-olive-mid ring-4 ring-surface" />
    <div class="-mx-2 overflow-clip">
      <div
        class="flex items-start transition-transform duration-500 ease-(--ease-premium) motion-reduce:transition-none"
        :class="{ '-translate-x-full rtl:translate-x-full': isImageShown }"
      >
        <component
          :is="step.imageUrl ? 'button' : 'div'"
          ref="summary"
          class="w-full shrink-0 px-2 py-1 text-left"
          :class="{ 'group rounded-card transition-colors hover:bg-subtle': step.imageUrl }"
          :type="step.imageUrl ? 'button' : undefined"
          :aria-expanded="step.imageUrl ? isImageShown : undefined"
          :inert="isImageShown"
          @click="handleShowImage"
        >
          <span class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="font-medium text-fg-display">{{ step.label }}</span>
            <span class="body-two tabular-nums">{{ formatTime(step.at) }}</span>
          </span>
          <span class="body-two block">{{ step.detail }}</span>
          <span class="flex flex-wrap items-center justify-between gap-2">
            <span class="caption">{{ $t('lot.detail.by', { name: step.by }) }}</span>
            <span v-if="step.imageUrl" class="link flex items-center gap-1.5 group-hover:underline">
              <image-line-icon class="h-4 w-4" />
              {{ $t('lot.timeline.showPhoto') }}
              <arrow-right-line-icon class="h-4 w-4 transition-transform duration-300 ease-(--ease-premium) group-hover:translate-x-0.5" />
            </span>
          </span>
        </component>

        <div
          v-if="step.imageUrl"
          class="grid w-full shrink-0 px-2 transition-[grid-template-rows] duration-500 ease-(--ease-premium) motion-reduce:transition-none"
          :class="isImageShown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          :inert="!isImageShown"
        >
          <div class="flex min-h-0 flex-col gap-2 overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-2 py-1">
              <button ref="back" type="button" class="link flex items-center gap-1.5" @click="handleHideImage">
                <arrow-left-line-icon class="h-4 w-4" />
                {{ $t('lot.timeline.backToStep') }}
              </button>
              <span class="body-three tabular-nums">{{ step.label }} · {{ formatTime(step.at) }}</span>
            </div>
            <div class="flex h-56 shrink-0 items-center justify-center overflow-hidden rounded-card bg-subtle sm:h-72">
              <p v-if="hasImageError" class="body-two">{{ $t('lot.timeline.photoUnavailable') }}</p>
              <img
                v-else-if="hasOpened"
                class="h-full w-full object-contain"
                :src="step.imageUrl"
                :alt="$t('lot.timeline.photoAlt', { step: step.label })"
                @error="handleImageError"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
// imports
import { nextTick, ref, useTemplateRef } from 'vue';

import { formatTime } from 'global/composables/date';
import type { ILotStep } from 'lot/types/lot';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import ImageLineIcon from 'global/icons/image-line.icon.vue';

// props
const props = defineProps<{ step: ILotStep }>();

// variables
const FOCUS_OPTIONS: FocusOptions = { preventScroll: true };
const summary = useTemplateRef<HTMLElement>('summary');
const back = useTemplateRef<HTMLElement>('back');
const isImageShown = ref(false);
const hasOpened = ref(false);
const hasImageError = ref(false);

// event handlers
const handleShowImage = async (): Promise<void> => {
  if (!props.step.imageUrl) return;
  hasOpened.value = true;
  isImageShown.value = true;
  await nextTick();
  back.value?.focus(FOCUS_OPTIONS);
};

const handleHideImage = async (): Promise<void> => {
  isImageShown.value = false;
  await nextTick();
  summary.value?.focus(FOCUS_OPTIONS);
};

const handleImageError = (): void => {
  hasImageError.value = true;
};
</script>
