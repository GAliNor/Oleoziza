<template>
  <Transition name="shimmer-swap" mode="out-in">
    <span :key="text" class="shimmer-text" :class="{ 'is-active': isActive }">{{ text }}</span>
  </Transition>
</template>

<script setup lang="ts">
// props
withDefaults(defineProps<{ text: string; isActive?: boolean }>(), { isActive: true });
</script>

<style scoped>
@reference "~/style.css";

.shimmer-text.is-active {
  background: linear-gradient(90deg, var(--text-color-fg-secondary-paragraph) 0%, var(--text-color-fg-secondary-paragraph) 40%, var(--text-color-fg-display) 50%, var(--text-color-fg-secondary-paragraph) 60%, var(--text-color-fg-secondary-paragraph) 100%);
  background-size: 250% 100%;
  background-clip: text;
  color: transparent;
  animation: shimmer-sweep 2.2s linear infinite;
}

.shimmer-swap-enter-active,
.shimmer-swap-leave-active {
  transition:
    opacity 0.25s var(--ease-premium),
    transform 0.25s var(--ease-premium),
    filter 0.25s var(--ease-premium);
}

.shimmer-swap-enter-from {
  opacity: 0;
  transform: translateY(4px);
  filter: blur(2px);
}

.shimmer-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  filter: blur(2px);
}

@keyframes shimmer-sweep {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -150% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer-text.is-active {
    animation: none;
    color: var(--text-color-fg-secondary-paragraph);
    background: none;
  }

  .shimmer-swap-enter-active,
  .shimmer-swap-leave-active {
    transition: none;
  }
}
</style>
