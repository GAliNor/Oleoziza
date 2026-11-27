<template>
  <div class="flex h-8 items-center gap-0.75" role="img" :aria-label="label">
    <span v-for="(level, index) in levels" :key="index" class="waveform-bar w-0.75 rounded-full bg-current" :style="{ height: `${Math.max(12, level * 100)}%` }" />
  </div>
</template>

<script setup lang="ts">
// props
defineProps<{ levels: number[]; label: string }>();
</script>

<style scoped>
.waveform-bar {
  transition: height 90ms linear;
}

@media (prefers-reduced-motion: reduce) {
  .waveform-bar {
    transition: none;
  }
}
</style>
