<template>
  <div class="flex items-center justify-between rounded-control bg-subtle p-1.5">
    <button type="button" class="weight-key h-12 w-12 bg-surface text-xl" :disabled="!modelValue" :aria-label="`− ${label}`" @click="handleStep(-1)">−</button>
    <span class="text-center">
      <span class="block text-xl figure text-fg-display">{{ modelValue }}</span>
      <span class="block body-two">{{ label }} · {{ $t('reception.station.containerTare', { kg: formatNumber(tareKg, 1) }) }}</span>
    </span>
    <button type="button" class="weight-key h-12 w-12 bg-surface text-xl" :aria-label="`+ ${label}`" @click="handleStep(1)">+</button>
  </div>
</template>

<script setup lang="ts">
// imports
import { formatNumber } from 'global/composables/number';

// props
const props = defineProps<{ modelValue: number; label: string; tareKg: number }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: number): void }>();

// event handlers
const handleStep = (step: number): void => {
  emit('update:modelValue', Math.max(0, props.modelValue + step));
};
</script>
