<template>
  <div class="page-decoration pointer-events-none fixed end-0 -z-10 h-72 w-72 select-none md:h-[28rem] md:w-[28rem]" aria-hidden="true">
    <Transition name="decoration-swap">
      <img v-if="uri" :key="uri" :src="uri" alt="" class="absolute inset-0 h-full w-full" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { renderDecoration } from 'global/composables/decoration';

// stores
const route = useRoute();

// variables
const uri = ref<string | null>(null);

// methods
/** Each page gets its own triangles, seeded by its route, so moving between pages changes the corner softly. */
const showDecoration = async (seed: string): Promise<void> => {
  try {
    const rendered = await renderDecoration(seed, 'triangles');
    if (seed === String(route.name ?? route.path)) uri.value = rendered;
  } catch {
    uri.value = null;
  }
};

watch(() => String(route.name ?? route.path), showDecoration, { immediate: true });
</script>

<style scoped>
.page-decoration {
  bottom: var(--bottom-nav, 0px);
  mask-image: radial-gradient(circle at 100% 100%, #000 18%, transparent 70%);
  animation: decoration-breathe 9s ease-in-out infinite;
}

.page-decoration:dir(rtl) {
  mask-image: radial-gradient(circle at 0% 100%, #000 18%, transparent 70%);
}

.decoration-swap-enter-active,
.decoration-swap-leave-active {
  transition: opacity 1.2s var(--ease-premium);
}

.decoration-swap-enter-from,
.decoration-swap-leave-to {
  opacity: 0;
}

@keyframes decoration-breathe {
  0%,
  100% {
    opacity: 0.1;
  }

  50% {
    opacity: 0.2;
  }
}

:global(.dark) .page-decoration {
  animation-name: decoration-breathe-dark;
}

@keyframes decoration-breathe-dark {
  0%,
  100% {
    opacity: 0.06;
  }

  50% {
    opacity: 0.12;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-decoration {
    animation: none;
    opacity: 0.12;
  }

  .decoration-swap-enter-active,
  .decoration-swap-leave-active {
    transition: none;
  }
}
</style>
