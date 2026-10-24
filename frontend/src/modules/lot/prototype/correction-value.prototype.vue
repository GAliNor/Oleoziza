<template>
  <!-- PROTOTYPE: the new-value input of a Lot correction (ticket 0036), shaped by the field. -->
  <select v-if="field === 'mode'" class="input" :value="modelValue" @change="handleInput">
    <option value="" disabled>Nouveau type</option>
    <option v-for="(label, key) in MODE_LABELS" :key="key" :value="key">{{ label }}</option>
  </select>
  <select v-else-if="field === 'variety'" class="input" :value="modelValue" @change="handleInput">
    <option value="" disabled>Nouvelle variété</option>
    <option v-for="variety in VARIETIES" :key="variety" :value="variety">{{ variety }}</option>
  </select>
  <input
    v-else
    class="input"
    :value="modelValue"
    :type="field === 'client' ? 'text' : 'number'"
    :inputmode="field === 'client' ? 'text' : 'decimal'"
    :placeholder="field === 'client' ? 'Nouveau Client' : 'Nouvelle valeur en kg'"
    @input="handleInput"
  />
</template>

<script setup lang="ts">
// imports
import { MODE_LABELS, VARIETIES, type CorrectableField } from 'lot/prototype/mock-lots.prototype';

// props
defineProps<{ field: CorrectableField; modelValue: string }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>();

// event handlers
const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLSelectElement).value);
};
</script>
