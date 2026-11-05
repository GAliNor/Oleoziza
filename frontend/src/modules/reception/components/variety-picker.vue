<template>
  <ul class="grid grid-cols-3 gap-2 sm:gap-3">
    <li v-for="variety in OLIVE_VARIETIES" :key="variety.slug">
      <button
        type="button"
        class="select-tile group relative flex w-full flex-col overflow-hidden text-center"
        :class="{ 'select-tile-active': modelValue === variety.name }"
        :aria-pressed="modelValue === variety.name"
        @click="emit('update:modelValue', variety.name)"
      >
        <span class="flex aspect-square w-full items-center justify-center overflow-hidden bg-subtle/60">
          <img
            v-if="illustrationOf(variety.slug)"
            class="h-full w-full object-cover transition-[scale] duration-700 ease-(--ease-premium) group-hover:scale-[1.05]"
            :src="illustrationOf(variety.slug)"
            alt=""
            draggable="false"
          />
          <olive-fill-icon v-else class="h-1/3 w-1/3 text-primary-olive-mid" />
        </span>
        <span
          class="flex min-h-12 items-center justify-center px-1.5 py-1 text-sm leading-tight transition-colors duration-200"
          :class="modelValue === variety.name ? 'font-semibold text-fg-brand' : 'font-medium text-fg-display'"
        >
          {{ variety.name }}
        </span>
        <span v-if="modelValue === variety.name" class="check-pop absolute top-1.5 inset-e-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-action text-fg-on-action shadow-raised">
          <check-line-icon class="h-4 w-4" />
        </span>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
// imports
import { OLIVE_VARIETIES } from 'reception/constants/reception';

import CheckLineIcon from 'global/icons/check-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';

// props
defineProps<{ modelValue: string }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', variety: string): void }>();

// variables
/** Dropping `<slug>.webp` or `.png` in assets/olive-varieties replaces that tile's placeholder. */
const ILLUSTRATIONS = import.meta.glob<string>('/src/assets/olive-varieties/*.{webp,png}', { eager: true, query: '?url', import: 'default' });

// methods
const illustrationOf = (slug: string): string | undefined => ILLUSTRATIONS[`/src/assets/olive-varieties/${slug}.webp`] ?? ILLUSTRATIONS[`/src/assets/olive-varieties/${slug}.png`];
</script>
