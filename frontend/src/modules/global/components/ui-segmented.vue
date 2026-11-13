<template>
  <div
    ref="track"
    :class="[containerClass, fadeClass]"
    :role="isChoice ? 'radiogroup' : 'tablist'"
    :aria-label="label"
    @scroll.passive="handleScroll"
    @keydown="handleKeydown"
    @pointerup="isPressing = false"
    @pointercancel="isPressing = false"
    @pointerleave="isPressing = false"
  >
    <span
      v-if="variant !== 'tabs'"
      class="thumb pointer-events-none absolute top-1 bottom-1 left-0 rounded-md"
      :class="[
        variant === 'strong-pills' ? 'bg-action shadow-raised shadow-primary-olive-dark/25' : 'bg-surface shadow-raised',
        { 'thumb-ready': isPlaced, 'opacity-0': !isPlaced, 'scale-[0.96]': isPressing },
      ]"
      :style="thumbStyle"
      aria-hidden="true"
    />
    <button
      v-for="option in options"
      :key="option.key"
      :ref="(element) => setButton(option.key, element as HTMLElement | null)"
      type="button"
      :role="isChoice ? 'radio' : 'tab'"
      :aria-selected="isChoice ? undefined : option.key === modelValue"
      :aria-checked="isChoice ? option.key === modelValue : undefined"
      :tabindex="option.key === (modelValue ?? options[0]?.key) ? 0 : -1"
      :disabled="isDisabled"
      :class="optionClass(option.key)"
      @pointerdown="isPressing = option.key === modelValue"
      @click="handleSelect(option.key)"
    >
      <slot name="option" :option="option">
        {{ option.label }}
        <span v-if="option.count !== undefined" class="tabular-nums opacity-70">{{ option.count }}</span>
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
// imports
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

// props
const props = withDefaults(
  defineProps<{
    options: { key: T; label: string; count?: number }[];
    modelValue: T | null;
    label: string;
    variant?: 'pills' | 'strong-pills' | 'tabs';
    isFull?: boolean;
    /** A form choice (radio group) rather than tabs that switch a panel. */
    isChoice?: boolean;
    isDisabled?: boolean;
  }>(),
  { variant: 'pills', isFull: false, isChoice: false, isDisabled: false },
);

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: T): void }>();

// variables
const track = useTemplateRef<HTMLElement>('track');
const buttons = new Map<T, HTMLElement>();
const thumbStyle = ref<Record<string, string>>({ translate: '4px 0', width: '0px' });
const isPlaced = ref(false);
const isPressing = ref(false);
const fadeClass = ref('');
let resizeObserver: ResizeObserver | null = null;

// computed
const containerClass = computed((): string[] => {
  if (props.variant === 'tabs') return props.isFull ? ['grid grid-flow-col auto-cols-fr rounded-control bg-subtle p-1'] : ['inline-flex rounded-control bg-subtle p-1'];
  return [
    props.isFull ? 'relative grid grid-flow-col auto-cols-fr rounded-control p-1' : 'no-scrollbar relative flex max-w-full overflow-x-auto rounded-control p-1',
    props.variant === 'strong-pills' ? 'bg-surface shadow-raised ring-1 ring-default' : 'bg-subtle',
  ];
});

// watchers
watch(
  () => [props.modelValue, props.options.map((option) => option.label + option.count).join()],
  () => nextTick(placeThumb),
);

// methods
const setButton = (key: T, element: HTMLElement | null): void => {
  if (element) buttons.set(key, element);
  else buttons.delete(key);
};

const optionClass = (key: T): string[] => {
  const isSelected = key === props.modelValue;
  if (props.variant === 'tabs') {
    return [
      'press text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-focus',
      props.isFull ? 'min-h-11 rounded-md' : 'min-h-10 rounded-md px-4',
      isSelected ? 'bg-surface text-fg-display shadow-raised' : 'text-fg-secondary-paragraph hover:text-fg-default',
    ];
  }
  return [
    'relative z-10 flex shrink-0 items-center gap-1.5 rounded-md px-4 font-medium whitespace-nowrap transition-colors duration-300',
    'focus-visible:outline-2 focus-visible:outline-focus',
    props.isFull ? 'min-h-13 justify-center text-md' : 'min-h-10 text-sm',
    isSelected ? (props.variant === 'strong-pills' ? 'text-fg-on-action' : 'text-fg-display') : 'text-fg-primary-paragraph hover:text-fg-display',
  ];
};

const isOutsideTrack = (button: HTMLElement, container: HTMLElement): boolean => {
  const buttonBox = button.getBoundingClientRect();
  const containerBox = container.getBoundingClientRect();
  return buttonBox.left < containerBox.left || buttonBox.right > containerBox.right;
};

const placeThumb = (): void => {
  if (props.variant === 'tabs') return;
  const button = props.modelValue === null ? undefined : buttons.get(props.modelValue);
  if (!button) return;
  thumbStyle.value = { translate: `${button.offsetLeft}px 0`, width: `${button.offsetWidth}px` };
  if (!isPlaced.value) requestAnimationFrame(() => (isPlaced.value = true));
  updateFade();
  const container = track.value;
  if (container && (isOutsideTrack(button, container))) {
    button.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
};

const updateFade = (): void => {
  const container = track.value;
  if (!container) return;
  const canLeft = container.scrollLeft > 4;
  const canRight = container.scrollLeft + container.clientWidth < container.scrollWidth - 4;
  fadeClass.value = canLeft && canRight ? 'fade-both' : canRight ? 'fade-right' : canLeft ? 'fade-left' : '';
};

const stepOf = (key: string, isRtl: boolean): number => {
  const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const step = steps[key] ?? 0;
  return isRtl && (key === 'ArrowRight' || key === 'ArrowLeft') ? -step : step;
};

const targetIndex = (key: string, current: number, isRtl: boolean): number | null => {
  const last = props.options.length - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  const step = stepOf(key, isRtl);
  return step ? (current + step + last + 1) % (last + 1) : null;
};

// event handlers
const handleScroll = (): void => {
  updateFade();
};

const handleSelect = (key: T): void => {
  emit('update:modelValue', key);
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (props.isDisabled) return;
  const current = props.options.findIndex((option) => option.key === props.modelValue);
  const isRtl = track.value ? getComputedStyle(track.value).direction === 'rtl' : false;
  const index = targetIndex(event.key, current, isRtl);
  if (index === null) return;
  event.preventDefault();
  const next = props.options[index].key;
  emit('update:modelValue', next);
  buttons.get(next)?.focus();
};

// lifecycle
onMounted(() => {
  placeThumb();
  resizeObserver = new ResizeObserver(placeThumb);
  if (track.value) resizeObserver.observe(track.value);
});
onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<style scoped>
.thumb-ready {
  transition:
    translate 600ms var(--ease-glide),
    width 600ms var(--ease-glide),
    scale 200ms var(--ease-premium),
    opacity 200ms var(--ease-premium);
}

@media (prefers-reduced-motion: reduce) {
  .thumb-ready {
    transition: opacity 200ms linear;
  }
}

.fade-right {
  mask-image: linear-gradient(to right, black 82%, transparent);
}

.fade-left {
  mask-image: linear-gradient(to left, black 82%, transparent);
}

.fade-both {
  mask-image: linear-gradient(to right, transparent, black 14%, black 86%, transparent);
}
</style>
