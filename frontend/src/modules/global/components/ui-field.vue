<template>
  <div class="field flex flex-col gap-2" :data-field="name" @focusout="handleFocusOut">
    <div class="flex items-center gap-2">
      <label class="label" :for="id">{{ label }}</label>
      <span v-if="isOptional" class="caption">{{ $t('global.form.optional') }}</span>
      <Transition name="tick">
        <check-line-icon v-if="isValid && !error" class="ms-auto h-4 w-4 text-fg-success" />
      </Transition>
    </div>
    <slot :id="id" :described-by="error ? errorId : undefined" :is-invalid="!!error" />
    <Transition name="field-message">
      <p v-if="error" :id="errorId" class="form-error" role="alert">{{ error }}</p>
    </Transition>
    <p v-if="hint && !error" class="body-three">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
// imports
import { useId } from 'vue';

import CheckLineIcon from 'global/icons/check-line.icon.vue';

// props
withDefaults(
  defineProps<{
    label: string;
    /** Names the field for `useFormFeedback` and the form bar. */
    name?: string;
    isOptional?: boolean;
    error?: string | null;
    isValid?: boolean;
    hint?: string;
  }>(),
  { name: undefined, error: null, hint: undefined },
);

// emits
const emit = defineEmits<{ (event: 'leave'): void }>();

// variables
const id = useId();
const errorId = useId();

// event handlers
/** Left for good: moving between the controls of one field doesn't count. */
const handleFocusOut = (event: FocusEvent): void => {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) emit('leave');
};
</script>
