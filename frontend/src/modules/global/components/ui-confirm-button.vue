<template>
  <button
    type="button"
    class="btn-secondary border-danger-subtle text-fg-danger hover:border-danger hover:bg-danger-subtle"
    :class="{ 'bg-danger text-fg-on-action hover:bg-danger/90': isArmed }"
    :disabled="isDisabled"
    @click="handleClick"
    @blur="handleBlur"
  >
    {{ isArmed ? confirmLabel : label }}
  </button>
</template>

<script setup lang="ts">
// props
defineProps<{ label: string; confirmLabel: string; isDisabled?: boolean }>();

// emits
const emit = defineEmits<{ confirm: [] }>();

// variables
const isArmed = defineModel<boolean>('isArmed', { default: false });

// event handlers
const handleClick = (): void => {
  if (!isArmed.value) {
    isArmed.value = true;
    return;
  }
  isArmed.value = false;
  emit('confirm');
};

const handleBlur = (): void => {
  isArmed.value = false;
};
</script>
