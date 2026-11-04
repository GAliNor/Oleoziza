<template>
  <div
    ref="track"
    :class="[containerClass, fadeClass]"
    role="tablist"
    :aria-label="label"
    @scroll.passive="handleScroll"
  >
    <span
      v-if="variant !== 'tabs'"
      class="pointer-events-none absolute top-1 bottom-1 rounded-md transition-[left,width] duration-500 ease-(--ease-sheet)"
      :class="variant === 'strong-pills' ? 'bg-action shadow-raised shadow-primary-olive-dark/25' : 'bg-surface shadow-raised'"
      :style="indicatorStyle"
      aria-hidden="true"
    />
    <button
      v-for="option in options"
      :key="option.key"
      :ref="(element) => setButton(option.key, element as HTMLElement | null)"
      type="button"
      role="tab"
      :aria-selected="option.key === modelValue"
      :class="optionClass(option.key)"
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
    modelValue: T;
    label: string;
    variant?: 'pills' | 'strong-pills' | 'tabs';
    isFull?: boolean;
  }>(),
  { variant: 'pills', isFull: false },
);

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: T): void }>();

// variables
const track = useTemplateRef<HTMLElement>('track');
const buttons = new Map<T, HTMLElement>();
const indicatorStyle = ref<Record<string, string>>({ left: '4px', width: '0px' });
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
  () => nextTick(placeIndicator),
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
      'press text-sm font-medium whitespace-nowrap',
      props.isFull ? 'min-h-11 rounded-md' : 'min-h-10 rounded-md px-4',
      isSelected ? 'bg-surface text-fg-display shadow-raised' : 'text-fg-secondary-paragraph hover:text-fg-default',
    ];
  }
  return [
    'press relative z-10 flex shrink-0 items-center gap-1.5 rounded-md px-4 font-medium whitespace-nowrap',
    props.isFull ? 'min-h-13 justify-center text-md' : 'min-h-10 text-sm',
    isSelected ? (props.variant === 'strong-pills' ? 'text-fg-on-action' : 'text-fg-display') : 'text-fg-primary-paragraph hover:text-fg-display',
  ];
};

const placeIndicator = (): void => {
  if (props.variant === 'tabs') return;
  const button = buttons.get(props.modelValue);
  if (!button) return;
  indicatorStyle.value = { left: `${button.offsetLeft}px`, width: `${button.offsetWidth}px` };
  updateFade();
  const container = track.value;
  if (container && (button.offsetLeft < container.scrollLeft || button.offsetLeft + button.offsetWidth > container.scrollLeft + container.clientWidth)) {
    container.scrollTo({ left: button.offsetLeft - 24, behavior: 'smooth' });
  }
};

const updateFade = (): void => {
  const container = track.value;
  if (!container) return;
  const canLeft = container.scrollLeft > 4;
  const canRight = container.scrollLeft + container.clientWidth < container.scrollWidth - 4;
  fadeClass.value = canLeft && canRight ? 'fade-both' : canRight ? 'fade-right' : canLeft ? 'fade-left' : '';
};

// event handlers
const handleScroll = (): void => {
  updateFade();
};

const handleSelect = (key: T): void => {
  emit('update:modelValue', key);
};

// lifecycle
onMounted(() => {
  placeIndicator();
  resizeObserver = new ResizeObserver(placeIndicator);
  if (track.value) resizeObserver.observe(track.value);
});
onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<style scoped>
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
