<template>
  <div class="grid grid-cols-3 gap-2.5">
    <button
      v-for="key in KEYS"
      :key="key"
      type="button"
      class="weight-key"
      :aria-label="key === 'erase' ? $t('reception.pad.erase') : key"
      @click="handleKey(key)"
    >
      <delete-back-line-icon v-if="key === 'erase'" class="h-7 w-7" />
      <template v-else>{{ key }}</template>
    </button>
  </div>
</template>

<script setup lang="ts">
// imports
import { onBeforeUnmount, onMounted, watch } from 'vue';

import { WEIGHT_MAX_DIGITS } from 'reception/constants/reception';

import DeleteBackLineIcon from 'global/icons/delete-back-line.icon.vue';

// props
const props = defineProps<{ modelValue: number | null }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: number | null): void }>();

// variables
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'erase'];
let buffer = toBuffer(props.modelValue);

// watchers
watch(
  () => props.modelValue,
  (value) => {
    if (toValue(buffer) !== value) buffer = toBuffer(value);
  },
);

// methods
function toBuffer(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

function toValue(text: string): number | null {
  return text ? Number(text.replace(',', '.')) : null;
}

const pressKey = (key: string): void => {
  if (key === 'erase') buffer = buffer.slice(0, -1);
  else if (key === ',') buffer = buffer.includes(',') ? buffer : `${buffer || '0'},`;
  else if (buffer.split(',')[1]?.length) return;
  else if (buffer.replace(',', '').length < WEIGHT_MAX_DIGITS) buffer = buffer === '0' ? key : buffer + key;
  emit('update:modelValue', toValue(buffer));
};

// event handlers
const handleKey = (key: string): void => {
  pressKey(key);
};

const handleKeydown = (event: KeyboardEvent): void => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select')) return;
  if (/^\d$/.test(event.key)) pressKey(event.key);
  else if (event.key === ',' || event.key === '.') pressKey(',');
  else if (event.key === 'Backspace') pressKey('erase');
};

// lifecycle
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>
