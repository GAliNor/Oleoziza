<template>
  <div class="flex flex-col gap-3">
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1 class="display-one text-balance">{{ title }}</h1>
    <p v-if="subtitle" class="body-one text-pretty text-neutral-500">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
// props
defineProps<{ eyebrow: string; title: string; subtitle?: string }>();
</script>
