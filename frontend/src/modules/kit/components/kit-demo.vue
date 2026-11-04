<template>
  <div class="card flex min-w-0 flex-col gap-4">
    <code class="font-mono text-xs text-fg-secondary-paragraph">{{ name }}</code>
    <slot />
  </div>
</template>

<script setup lang="ts">
// props
defineProps<{ name: string }>();
</script>
