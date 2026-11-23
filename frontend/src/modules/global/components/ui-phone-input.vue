<template>
  <input :value="modelValue" class="input tabular-nums" type="tel" inputmode="tel" dir="ltr" autocomplete="off" :placeholder="$t('global.form.phonePlaceholder')" @input="handleInput" />
</template>

<script setup lang="ts">
// imports
import { nextTick } from 'vue';

import { formatPhoneTyping } from 'global/composables/phone';

// emits
const modelValue = defineModel<string>({ required: true });

// event handlers
/** Groups the digits as they are typed; the caret keeps its place among them. */
const handleInput = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const caret = input.selectionStart ?? input.value.length;
  const charactersBefore = input.value.slice(0, caret).replace(/\s/g, '').length;
  modelValue.value = formatPhoneTyping(input.value);
  await nextTick();
  if (input.value !== modelValue.value) input.value = modelValue.value;
  let position = 0;
  for (let seen = 0; position < input.value.length && seen < charactersBefore; position += 1) if (input.value[position] !== ' ') seen += 1;
  input.setSelectionRange(position, position);
};
</script>
