<template>
  <div class="flex items-center justify-between rounded-2xl bg-neutral-100 p-1.5">
    <button type="button" class="weight-key h-12 w-12 bg-white text-xl" :disabled="!modelValue" :aria-label="`− ${label}`" @click="handleStep(-1)">−</button>
    <span class="text-center">
      <span class="block text-xl font-semibold text-neutral-900 tabular-nums">{{ modelValue }}</span>
      <span class="block text-xs text-neutral-500">{{ label }} · {{ $t('reception.station.containerTare', { kg: tareKg.toLocaleString('fr-FR') }) }}</span>
    </span>
    <button type="button" class="weight-key h-12 w-12 bg-white text-xl" :aria-label="`+ ${label}`" @click="handleStep(1)">+</button>
  </div>
</template>

<script setup lang="ts">
// props
const props = defineProps<{ modelValue: number; label: string; tareKg: number }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: number): void }>();

// event handlers
const handleStep = (step: number): void => {
  emit('update:modelValue', Math.max(0, props.modelValue + step));
};
</script>
