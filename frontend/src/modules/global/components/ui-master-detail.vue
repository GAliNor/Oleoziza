<template>
  <div class="flex min-w-0 gap-4 overflow-x-clip">
    <div class="pane pane-list flex w-full shrink-0 flex-col gap-3" :class="{ 'is-away': isOpen }">
      <slot name="list" />
    </div>
    <aside
      v-if="$slots.detail"
      class="pane pane-detail flex w-full shrink-0 flex-col gap-4"
      :class="{ 'is-away pointer-events-none': !isOpen }"
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
/** Escape goes back, except while typing in a field or using a menu, where it belongs to that control. */
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || !props.isOpen || event.defaultPrevented) return;
  if ((event.target as HTMLElement | null)?.closest('input, textarea, [role="listbox"], [role="combobox"], [aria-expanded="true"]')) return;
  emit('close');
};

// lifecycle
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<style scoped>
/* A push, as on iOS: both panes slide together, the one leaving dims, and it is hidden and collapsed only once the slide is over. */
.pane {
  transition:
    margin-inline-start 520ms var(--ease-premium),
    opacity 420ms var(--ease-premium),
    visibility 0s linear 0s,
    max-height 0s linear 0s;
}

.pane.is-away {
  visibility: hidden;
  max-height: 0;
  overflow: hidden;
  opacity: 0.3;
  transition:
    margin-inline-start 520ms var(--ease-premium),
    opacity 520ms var(--ease-premium),
    visibility 0s linear 520ms,
    max-height 0s linear 520ms;
}

.pane-list.is-away {
  margin-inline-start: calc(-100% - 1rem);
}

@media (prefers-reduced-motion: reduce) {
  .pane,
  .pane.is-away {
    transition: none;
  }
}
</style>
