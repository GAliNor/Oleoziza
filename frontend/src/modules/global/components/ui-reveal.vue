<template>
  <div>
    <button type="button" class="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control px-2 text-sm text-fg-secondary-paragraph transition-colors duration-200 ease-(--ease-premium) hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" :aria-expanded="isOpen" :aria-controls="panelId" @click="isOpen = !isOpen">
      <chevron-right-line-icon class="chevron h-3.5 w-3.5" :class="{ 'is-open': isOpen }" />
      {{ label }}
    </button>
    <div :id="panelId" class="panel" :class="{ 'is-open': isOpen }" :inert="!isOpen">
      <div class="min-h-0 overflow-hidden">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref, useId } from 'vue';

import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';

// props
defineProps<{ label: string }>();

// variables
const isOpen = ref(false);
const panelId = useId();
</script>

<style scoped>
/* A quiet fold, as a toggle in a page of notes: the height glides, the chevron turns. */
.panel {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 380ms var(--ease-premium),
    opacity 260ms ease-out;
}

.panel.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.chevron {
  transition: transform 380ms var(--ease-spring);
}

.chevron.is-open {
  transform: rotate(90deg);
}

@media (prefers-reduced-motion: reduce) {
  .panel,
  .chevron {
    transition: none;
  }
}
</style>
