<template>
  <div class="stagger flex flex-col items-center gap-6 py-8 text-center" role="status">
    <div class="success-badge flex h-24 w-24 items-center justify-center rounded-full bg-success-subtle">
      <animated-check-icon class="h-12 w-12 text-fg-success" />
    </div>
    <div class="flex flex-col gap-2">
      <h1 class="heading-one text-fg-success">{{ $t('auth.login.success') }}</h1>
      <p class="body-two">{{ $t('auth.login.redirecting', { name: sessionStore.salutation }) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { useSessionStore } from 'global/stores/session';

import AnimatedCheckIcon from 'global/icons/animated-check.icon.vue';

// stores
const sessionStore = useSessionStore();
</script>

<style scoped>
.success-badge {
  animation: badge-pop 0.6s var(--ease-premium) both;
}

@keyframes badge-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .success-badge {
    animation: none;
  }
}
</style>
