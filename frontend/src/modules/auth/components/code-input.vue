<template>
  <input
    :id="id"
    :value="modelValue"
    class="input text-center font-mono text-2xl tracking-[0.6em]"
    type="text"
    inputmode="numeric"
    autocomplete="one-time-code"
    :maxlength="length"
    :disabled="isDisabled"
    :placeholder="'•'.repeat(length)"
    @input="handleInput"
  />
</template>

<script setup lang="ts">
// props
const props = defineProps<{ modelValue: string; length: number; id?: string; isDisabled?: boolean }>();

// emits
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'complete', value: string): void;
}>();

// event handlers
const handleInput = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const value = input.value.replace(/\D/g, '').slice(0, props.length);
  input.value = value;
  emit('update:modelValue', value);
  if (value.length === props.length) emit('complete', value);
};
</script>
