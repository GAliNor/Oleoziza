<template>
  <span class="relative block h-6 w-10 shrink-0 rounded-full transition-colors duration-300" :class="[isOn ? 'bg-action' : 'bg-emphasis', { 'animate-pulse': isPending }]">
    <span
      class="absolute top-1 inset-s-1 h-4 w-4 rounded-full bg-surface shadow-raised transition-transform duration-300 ease-(--ease-premium)"
      :class="{ 'translate-x-4 rtl:-translate-x-4': isOn }"
    />
  </span>
</template>

<script setup lang="ts">
// props
defineProps<{ isOn: boolean; isPending?: boolean }>();
</script>
