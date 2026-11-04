<template>
  <div class="flex flex-col gap-2">
    <label class="label" :for="id">{{ label }}</label>
    <slot :id="id" />
  </div>
</template>

<script setup lang="ts">
// imports
import { useId } from 'vue';

// props
defineProps<{ label: string }>();

// variables
const id = useId();
</script>
