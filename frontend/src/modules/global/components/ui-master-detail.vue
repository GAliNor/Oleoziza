<template>
  <div class="flex min-w-0 gap-4 overflow-hidden">
    <div class="flex w-full shrink-0 flex-col gap-3 transition-[margin,width] duration-500 ease-(--ease-premium)" :class="{ 'invisible -ms-[calc(100%+1rem)] h-0 overflow-hidden': isOpen }">
      <slot name="list" />
    </div>
    <aside
      v-if="$slots.detail"
      class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)"
      :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'"
      :aria-hidden="!isOpen"
    >
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-plain ps-2" @click="emit('close')">
          <arrow-left-line-icon class="h-4 w-4" />
          {{ backLabel }}
        </button>
        <slot name="actions" />
      </div>
      <slot name="detail" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// imports
import { onBeforeUnmount, onMounted } from 'vue';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// props
const props = defineProps<{ isOpen: boolean; backLabel: string }>();

// emits
const emit = defineEmits<{ (event: 'close'): void }>();

// event handlers
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && props.isOpen) emit('close');
};

// lifecycle
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>
