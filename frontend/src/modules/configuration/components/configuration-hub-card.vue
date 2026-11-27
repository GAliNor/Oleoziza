<template>
  <router-link :to="to" class="hub-card card press group flex min-h-48 flex-col gap-4 p-6">
    <div class="flex items-start justify-between gap-3">
      <span class="grid h-12 w-12 place-items-center rounded-card bg-selected text-fg-brand"><component :is="icon" class="h-6 w-6" /></span>
      <chevron-right-line-icon class="hub-arrow h-5 w-5 text-fg-muted rtl:-scale-x-100" aria-hidden="true" />
    </div>
    <div class="flex flex-col gap-1">
      <h2 class="heading-three">{{ title }}</h2>
      <p class="body-two">{{ description }}</p>
    </div>
    <ul class="mt-auto flex flex-wrap gap-1.5">
      <li v-for="item in items" :key="item" class="chip bg-subtle text-fg-primary-paragraph">{{ item }}</li>
    </ul>
    <p v-if="status" class="border-t border-subtle pt-3 text-sm font-medium text-fg-default tabular-nums">{{ status }}</p>
  </router-link>
</template>

<script setup lang="ts">
// imports
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';

// props
withDefaults(defineProps<{ to: RouteLocationRaw; icon: Component; title: string; description: string; items: string[]; status?: string }>(), { status: undefined });
</script>

<style scoped>
@reference "~/style.css";

.hub-card {
  transition:
    border-color 0.25s var(--ease-premium),
    box-shadow 0.3s var(--ease-premium);
}

.hub-card:hover {
  @apply border-brand shadow-raised;
}

.hub-card:focus-visible {
  @apply outline-2 outline-focus;
}

.hub-arrow {
  transition: transform 0.3s var(--ease-premium);
}

.hub-card:hover .hub-arrow {
  transform: translateX(3px);
}

.hub-card:hover .hub-arrow:dir(rtl) {
  transform: translateX(-3px) scaleX(-1);
}

@media (prefers-reduced-motion: reduce) {
  .hub-card,
  .hub-arrow {
    transition: none;
  }
}
</style>
