<template>
  <div class="form-bar sticky z-20 -mx-4 flex flex-col gap-2 border-t border-default bg-surface/95 px-4 pt-3 backdrop-blur md:mx-0 md:rounded-card md:border md:shadow-raised" :style="{ bottom: `max(var(--bottom-nav, 0px), ${keyboardInset}px)` }">
    <div ref="statusBox" class="relative">
      <Transition name="bar-status">
        <div v-if="problems.length" key="problems" class="flex items-center gap-2" role="status" aria-live="polite">
          <span class="shrink-0 text-sm font-medium" :class="isAttempted ? 'text-fg-danger' : 'text-fg-secondary-paragraph'">{{ $t(isAttempted ? 'global.form.toFix' : 'global.form.missing') }}</span>
          <TransitionGroup tag="ul" name="problem-chip" class="no-scrollbar relative flex min-w-0 gap-2 overflow-x-auto py-1">
            <li v-for="problem in problems" :key="problem.key" class="shrink-0">
              <button
                type="button"
                class="min-h-9 cursor-pointer rounded-control border px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-(--ease-premium) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                :class="isAttempted || !problem.isMissing ? 'border-danger-subtle bg-danger-subtle text-fg-danger' : 'border-default bg-page text-fg-primary-paragraph hover:border-strong'"
                @click="emit('jump', problem.key)"
              >
                {{ problem.label }}
              </button>
            </li>
          </TransitionGroup>
        </div>
        <p v-else key="ready" class="flex min-h-11 items-center gap-1.5 text-sm font-medium text-fg-success" role="status">
          <check-circle-line-icon class="ready-check h-4 w-4" />
          {{ $t('global.form.ready') }}
        </p>
      </Transition>
    </div>
    <div class="flex gap-2" :class="{ 'sm:justify-end': !isWide }">
      <slot name="actions" />
      <button type="button" class="btn-primary min-h-13 flex-1 text-md" :class="{ 'sm:flex-none': !isWide }" :disabled="isBusy || isDisabled" :aria-busy="isBusy" @click="emit('submit')">
        <span v-if="isBusy" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-e-transparent" aria-hidden="true" />
        {{ submitLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';

import { useKeyboardInset } from 'global/composables/use-keyboard-inset';
import { useSmoothHeight } from 'global/composables/use-smooth-height';
import type { IFormProblem } from 'global/types/form';

import CheckCircleLineIcon from 'global/icons/check-circle-line.icon.vue';

// props
const props = withDefaults(
  defineProps<{
    problems: IFormProblem[];
    submitLabel: string;
    isAttempted?: boolean;
    isBusy?: boolean;
    /** Only for what the form can't fix: offline, no right. */
    isDisabled?: boolean;
    isWide?: boolean;
  }>(),
  { isWide: true },
);

// emits
const emit = defineEmits<{
  (event: 'submit'): void;
  (event: 'jump', key: string): void;
}>();

// variables
const keyboardInset = useKeyboardInset();
const statusBox = ref<HTMLElement | null>(null);
useSmoothHeight(statusBox, () => props.problems.length === 0);
</script>

<style scoped>
.form-bar {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  transition: bottom 220ms var(--ease-sheet);
}

.problem-chip-enter-active,
.problem-chip-leave-active,
.problem-chip-move {
  transition:
    opacity 260ms var(--ease-premium),
    transform 260ms var(--ease-premium),
    filter 260ms var(--ease-premium);
}

.problem-chip-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.problem-chip-leave-to {
  opacity: 0;
  transform: scale(0.85);
  filter: blur(3px);
}

/* The last missing item leaves with its row, while « all ready » settles in and its check springs. */
.bar-status-enter-active {
  transition:
    opacity 380ms var(--ease-premium),
    transform 460ms var(--ease-premium),
    filter 380ms var(--ease-premium);
}

.bar-status-leave-active {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  pointer-events: none;
  transition:
    opacity 220ms ease-out,
    transform 220ms ease-out,
    filter 220ms ease-out;
}

.bar-status-enter-from {
  opacity: 0;
  transform: translateY(6px);
  filter: blur(4px);
}

.bar-status-leave-to {
  opacity: 0;
  transform: scale(0.97);
  filter: blur(4px);
}

.bar-status-enter-active .ready-check {
  animation: ready-check 520ms 120ms var(--ease-spring) backwards;
}

@keyframes ready-check {
  from {
    opacity: 0;
    scale: 0.4;
  }
}

.problem-chip-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .form-bar,
  .problem-chip-enter-active,
  .problem-chip-leave-active,
  .problem-chip-move,
  .bar-status-enter-active,
  .bar-status-leave-active {
    transition: none;
  }

  .bar-status-enter-active .ready-check {
    animation: none;
  }
}
</style>
