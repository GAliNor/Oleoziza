<template>
  <div class="card lift flex min-w-0 flex-col gap-1.5 rounded-2xl p-5">
    <p class="eyebrow text-neutral-500">{{ label }}</p>
    <p class="text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
      {{ formatted }}<span v-if="unit" class="ml-1 text-base font-medium text-neutral-500">{{ unit }}</span>
    </p>
    <p v-if="sub" class="body-two">{{ sub }}</p>
    <p v-if="delta" class="flex items-center gap-1 text-xs font-medium" :class="isDeltaGood ? 'text-success-green' : 'text-danger-red'">
      {{ delta }} <span class="font-normal text-neutral-500">{{ deltaLabel ?? 'vs saison préc.' }}</span>
    </p>
    <div v-if="progress !== undefined" class="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
      <div class="grow-x h-full rounded-full bg-primary-olive transition-[width] duration-700 ease-(--ease-premium)" :style="{ width: `${Math.min(progress, 100)}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — KPI tile for the Management Home (ticket 0019): label, counting-up value, unit, Season delta, thin bar.
// imports
import { computed, toRef } from 'vue';

import { useCountUp } from 'dashboard/prototype/use-count-up.prototype';

// props
const props = withDefaults(
  defineProps<{
    label: string;
    value: number;
    decimals?: number;
    unit?: string;
    sub?: string;
    delta?: string;
    deltaLabel?: string;
    isDeltaGood?: boolean;
    progress?: number;
  }>(),
  { decimals: 0, unit: undefined, sub: undefined, delta: undefined, deltaLabel: undefined, progress: undefined },
);

// variables
const display = useCountUp(toRef(props, 'value'));

// computed
const formatted = computed((): string =>
  display.value.toLocaleString('fr-FR', { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals }),
);
</script>
