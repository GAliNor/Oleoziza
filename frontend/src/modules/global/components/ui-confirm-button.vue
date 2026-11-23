<template>
  <button
    type="button"
    :class="[
      isQuiet ? 'btn-plain min-h-9 px-2.5' : 'btn-secondary',
      isDanger || isQuiet ? (isQuiet ? 'text-fg-secondary-paragraph hover:bg-danger-subtle hover:text-fg-danger' : 'border-danger-subtle text-fg-danger hover:border-danger hover:bg-danger-subtle') : '',
      { 'bg-danger text-fg-on-action hover:bg-danger/90 hover:text-fg-on-action': isArmed && (isDanger || isQuiet), 'bg-action text-fg-on-action hover:bg-action-hover': isArmed && !isDanger && !isQuiet },
    ]"
    :disabled="isDisabled"
    @click="handleClick"
    @blur="handleBlur"
  >
    {{ isArmed ? confirmLabel : label }}
  </button>
</template>

<script setup lang="ts">
// props
withDefaults(
  defineProps<{
    label: string;
    confirmLabel: string;
    isDisabled?: boolean;
    /** Off for a step that can be taken back. */
    isDanger?: boolean;
    /** A small text button, for a row of a list. */
    isQuiet?: boolean;
  }>(),
  { isDanger: true },
);

// emits
const emit = defineEmits<{ (event: 'confirm'): void }>();

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
