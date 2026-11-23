<template>
  <div ref="root" class="relative overflow-x-clip">
    <Transition :name="isAway ? 'slide-push' : 'slide-pop'">
      <div v-if="isAway" key="away" class="w-full min-w-0">
        <slot name="away" />
      </div>
      <div v-else key="home" class="w-full min-w-0">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';

import { useSmoothHeight } from 'global/composables/use-smooth-height';

// props
/** Two contents in one place: the second slides in over the first, as a page pushed on iOS, and back. */
const props = defineProps<{ isAway: boolean }>();

// variables
const root = ref<HTMLElement | null>(null);
useSmoothHeight(root, () => props.isAway);
</script>

<style scoped>
.slide-push-enter-active,
.slide-push-leave-active,
.slide-pop-enter-active,
.slide-pop-leave-active {
  transition:
    transform 480ms var(--ease-premium),
    opacity 360ms var(--ease-premium);
}

.slide-push-leave-active,
.slide-pop-leave-active {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  pointer-events: none;
}

.slide-push-enter-from,
.slide-pop-leave-to {
  opacity: 0;
  transform: translateX(calc(var(--flow, 1) * 100%));
}

.slide-push-leave-to,
.slide-pop-enter-from {
  opacity: 0;
  transform: translateX(calc(var(--flow, 1) * -28%));
}

@media (prefers-reduced-motion: reduce) {
  .slide-push-enter-active,
  .slide-push-leave-active,
  .slide-pop-enter-active,
  .slide-pop-leave-active {
    transition: opacity 120ms linear;
  }

  .slide-push-enter-from,
  .slide-push-leave-to,
  .slide-pop-enter-from,
  .slide-pop-leave-to {
    transform: none;
  }
}
</style>
