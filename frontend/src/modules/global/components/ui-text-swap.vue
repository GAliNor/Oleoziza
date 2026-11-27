<template>
  <span class="inline-grid">
    <Transition name="text-swap">
      <span :key="text" class="[grid-area:1/1]">{{ text }}</span>
    </Transition>
  </span>
</template>

<script setup lang="ts">
// props
/** A text that changes in place: the old words dissolve upward while the new ones settle in, never a snap. */
defineProps<{ text: string }>();
</script>

<style scoped>
.text-swap-enter-active {
  transition:
    opacity 380ms var(--ease-premium),
    transform 480ms var(--ease-premium),
    filter 380ms var(--ease-premium);
}

.text-swap-leave-active {
  transition:
    opacity 200ms ease-out,
    transform 240ms ease-out,
    filter 200ms ease-out;
}

.text-swap-enter-from {
  opacity: 0;
  transform: translateY(0.35em);
  filter: blur(4px);
}

.text-swap-leave-to {
  opacity: 0;
  transform: translateY(-0.35em);
  filter: blur(4px);
}

@media (prefers-reduced-motion: reduce) {
  .text-swap-enter-active,
  .text-swap-leave-active {
    transition: opacity 120ms linear;
  }

  .text-swap-enter-from,
  .text-swap-leave-to {
    transform: none;
    filter: none;
  }
}
</style>
