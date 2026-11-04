<template>
  <div class="flex flex-col items-center gap-4 px-5 text-center" :class="SIZE_CLASSES[size]" :role="tone === 'danger' ? 'alert' : undefined">
    <p :class="tone === 'danger' ? 'body-two text-fg-danger' : 'body-two'">{{ message }}</p>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
// props
withDefaults(defineProps<{ message: string; tone?: 'neutral' | 'danger'; size?: 'compact' | 'default' | 'page' }>(), { tone: 'neutral', size: 'default' });

// variables
const SIZE_CLASSES = { compact: 'py-6', default: 'py-8', page: 'py-16' };
</script>
