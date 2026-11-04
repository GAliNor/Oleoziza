<template>
  <div
    class="overflow-hidden rounded-full"
    :class="trackClass"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="value"
  >
    <div class="grow-x h-full rounded-full transition-[width] duration-700 ease-(--ease-premium)" :class="barClass" :style="{ width: `${Math.min((value / max) * 100, 100)}%`, animationDelay: `${delay}ms` }" />
  </div>
</template>

<script setup lang="ts">
// props
withDefaults(defineProps<{ value: number; label: string; max?: number; barClass?: string; trackClass?: string; delay?: number }>(), {
  max: 100,
  barClass: 'bg-primary-olive',
  trackClass: 'bg-subtle',
  delay: 0,
});
</script>
