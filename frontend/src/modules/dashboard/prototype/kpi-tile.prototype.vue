<template>
  <div class="card flex flex-col gap-1.5 rounded-2xl p-5">
    <p class="eyebrow text-neutral-500">{{ label }}</p>
    <p class="text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
      {{ value }}<span v-if="unit" class="ml-1 text-base font-medium text-neutral-500">{{ unit }}</span>
    </p>
    <p v-if="sub" class="body-two">{{ sub }}</p>
    <p v-if="delta" class="flex items-center gap-1 text-xs font-medium" :class="isDeltaGood ? 'text-success-green' : 'text-danger-red'">
      {{ delta }} <span class="font-normal text-neutral-500">vs saison préc.</span>
    </p>
    <div v-if="progress !== undefined" class="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
      <div class="h-full rounded-full bg-primary-olive" :style="{ width: `${Math.min(progress, 100)}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — KPI tile for the Management Home prototype (ticket 0019): label, big value, unit, Season delta, thin bar.
// props
defineProps<{ label: string; value: string; unit?: string; sub?: string; delta?: string; isDeltaGood?: boolean; progress?: number }>();
</script>
