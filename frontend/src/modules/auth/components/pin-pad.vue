<template>
  <div class="flex flex-col items-center gap-8">
    <div class="flex gap-5" :class="{ shake: hasError }" role="status" :aria-label="$t('auth.pinPad.filled', { count: modelValue.length, total: length })">
      <span
        v-for="index in length"
        :key="index"
        class="h-3.5 w-3.5 rounded-full border-2 transition-[background-color,border-color,transform] duration-300
          ease-(--ease-premium)"
        :class="[
          hasError ? 'border-danger-red' : 'border-primary-olive',
          index <= modelValue.length ? 'scale-125 bg-primary-olive' : 'scale-100',
        ]"
      />
    </div>

    <div class="grid w-full max-w-[18rem] grid-cols-3 gap-x-6 gap-y-4">
      <button
        v-for="digit in DIGITS"
        :key="digit"
        type="button"
        class="pin-key"
        :disabled="isDisabled"
        @click="handleDigit(digit)"
      >
        {{ digit }}
      </button>
      <span />
      <button type="button" class="pin-key" :disabled="isDisabled" @click="handleDigit('0')">0</button>
      <button
        type="button"
        class="pin-key bg-transparent"
        :disabled="isDisabled || !modelValue.length"
        :aria-label="$t('auth.pinPad.erase')"
        @click="handleErase"
      >
        <delete-back-line-icon class="h-6 w-6" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { onBeforeUnmount, onMounted } from 'vue';

import DeleteBackLineIcon from 'global/icons/delete-back-line.icon.vue';

// props
const props = defineProps<{ modelValue: string; length: number; isDisabled?: boolean; hasError?: boolean }>();

// emits
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'complete', value: string): void;
}>();

// variables
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// methods
const addDigit = (digit: string): void => {
  if (props.isDisabled || props.modelValue.length >= props.length) return;
  const value = props.modelValue + digit;
  emit('update:modelValue', value);
  if (value.length === props.length) emit('complete', value);
};

const eraseDigit = (): void => {
  if (!props.isDisabled) emit('update:modelValue', props.modelValue.slice(0, -1));
};

// event handlers
const handleDigit = (digit: string): void => {
  addDigit(digit);
};

const handleErase = (): void => {
  eraseDigit();
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.target instanceof HTMLInputElement) return;
  if (/^\d$/.test(event.key)) addDigit(event.key);
  else if (event.key === 'Backspace') eraseDigit();
};

// lifecycle
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>
