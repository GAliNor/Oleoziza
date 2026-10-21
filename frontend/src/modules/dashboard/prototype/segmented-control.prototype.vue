<template>
  <div
    ref="track"
    class="no-scrollbar relative flex max-w-full overflow-x-auto rounded-full p-1"
    :class="[isDark ? 'bg-white shadow-sm ring-1 ring-neutral-200' : 'bg-neutral-100', fadeClass]"
    role="tablist"
    @scroll.passive="handleScroll"
  >
    <span
      class="pointer-events-none absolute top-1 bottom-1 rounded-full transition-[left,width] duration-500 ease-(--ease-premium)"
      :class="isDark ? 'bg-primary-olive-dark shadow-md shadow-primary-olive-dark/25' : 'bg-white shadow-sm'"
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
      class="relative z-10 flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap
        transition-colors duration-300"
      :class="optionClass(option.key)"
      @click="handleSelect(option.key)"
    >
      {{ option.label }}
      <span v-if="option.count !== undefined" class="tabular-nums opacity-70">{{ option.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
// PROTOTYPE — Apple-style segmented control: a pill slides under the selected option; scrolls sideways on a phone.
// imports
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

// props
const props = defineProps<{ options: { key: T; label: string; count?: number }[]; modelValue: T; isDark?: boolean }>();

// emits
const emit = defineEmits<{ 'update:modelValue': [value: T] }>();

// variables
const track = useTemplateRef<HTMLElement>('track');
const buttons = new Map<T, HTMLElement>();
const indicatorStyle = ref<Record<string, string>>({ left: '4px', width: '0px' });
const fadeClass = ref('');
let resizeObserver: ResizeObserver | null = null;

// methods
const setButton = (key: T, element: HTMLElement | null): void => {
  if (element) buttons.set(key, element);
  else buttons.delete(key);
};

const optionClass = (key: T): string => {
  if (key !== props.modelValue) return 'text-neutral-600 hover:text-neutral-900';
  return props.isDark ? 'text-white' : 'text-neutral-900';
};

const placeIndicator = (): void => {
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

// watchers
watch(
  () => [props.modelValue, props.options.map((option) => option.label + option.count).join()],
  () => nextTick(placeIndicator),
);

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
