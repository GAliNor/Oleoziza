<template>
  <button
    type="button"
    role="radio"
    class="flex flex-col gap-1 rounded-card p-1 text-start transition-shadow"
    :class="isSelected ? 'ring-2 ring-selected' : 'ring-1 ring-default hover:ring-selected'"
    :aria-checked="isSelected"
    :disabled="isDisabled"
    @click="emit('select')"
  >
    <season-art :season="art" frame-class="aspect-[4/1] w-full rounded-control" />
    <span class="caption px-1 pb-0.5" :class="isSelected ? 'text-fg' : 'text-fg-muted'">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
// imports
import type { SeasonArtImages } from 'season/types/season';

import SeasonArt from 'season/components/season-art.vue';

// props
defineProps<{ art: SeasonArtImages; label: string; isSelected: boolean; isDisabled?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'select'): void }>();
</script>
