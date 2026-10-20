<template>
  <div class="relative">
    <input
      :id="id"
      :value="modelValue"
      class="input pr-12"
      :type="showPassword ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :disabled="isDisabled"
      @input="handleInput"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-500 hover:text-neutral-800"
      :aria-label="showPassword ? $t('auth.password.hide') : $t('auth.password.show')"
      @click="handleToggle"
    >
      <component :is="showPassword ? EyeOffLineIcon : EyeLineIcon" class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';

import EyeLineIcon from 'global/icons/eye-line.icon.vue';
import EyeOffLineIcon from 'global/icons/eye-off-line.icon.vue';

// props
defineProps<{ modelValue: string; id?: string; autocomplete: string; placeholder?: string; isDisabled?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>();

// variables
const showPassword = ref(false);

// event handlers
const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
};

const handleToggle = (): void => {
  showPassword.value = !showPassword.value;
};
</script>
