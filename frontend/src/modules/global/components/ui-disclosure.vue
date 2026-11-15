<template>
  <section class="rounded-card bg-subtle" :class="{ 'is-open': isOpen }">
    <button
      :id="headerId"
      type="button"
      class="flex min-h-13 w-full cursor-pointer items-center justify-between gap-3 rounded-card px-4 text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="isOpen = !isOpen"
    >
      <span class="label">{{ title }}</span>
      <span class="chevron grid h-7 w-7 place-items-center rounded-control text-fg-muted" aria-hidden="true">
        <chevron-down-line-icon class="h-4 w-4" />
      </span>
    </button>
    <div :id="panelId" class="disclosure-panel" role="region" :aria-labelledby="headerId" :inert="!isOpen">
      <div class="disclosure-inner">
        <div class="disclosure-content px-4 pb-4">
          <slot />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { useId } from 'vue';

import ChevronDownLineIcon from 'global/icons/chevron-down-line.icon.vue';

// props
defineProps<{ title: string }>();

// emits
const isOpen = defineModel<boolean>('isOpen', { default: false });

// variables
const headerId = useId();
const panelId = useId();
</script>

<style scoped>
/* Height glides from 0 to its content (grid rows 0fr → 1fr), the content follows a beat later, the chevron turns: an iOS-style reveal. */
.disclosure-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 420ms var(--ease-premium);
}

.disclosure-inner {
  min-height: 0;
  overflow: hidden;
}

.disclosure-content {
  opacity: 0;
  transform: translateY(-6px) scale(0.99);
  transform-origin: top;
  transition:
    opacity 200ms ease-out,
    transform 260ms var(--ease-premium);
}

.chevron {
  transition:
    transform 420ms var(--ease-spring),
    background-color 200ms ease-out;
}

.is-open .disclosure-panel {
  grid-template-rows: 1fr;
}

.is-open .disclosure-content {
  opacity: 1;
  transform: none;
  transition:
    opacity 320ms ease-out 120ms,
    transform 420ms var(--ease-premium) 80ms;
}

.is-open .chevron {
  transform: rotate(180deg);
}

button:hover .chevron {
  background-color: var(--color-neutral-100);
}

@media (prefers-reduced-motion: reduce) {
  .disclosure-panel,
  .disclosure-content,
  .chevron,
  .is-open .disclosure-content {
    transition: none;
  }
}
</style>
