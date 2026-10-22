<template>
  <div class="flex min-w-0 flex-col gap-0.5">
    <p class="truncate text-[11px] font-semibold tracking-widest uppercase" :class="isDark ? 'text-primary-olive-light' : 'text-neutral-500'">{{ label }}</p>
    <p class="text-2xl font-semibold tracking-tight tabular-nums" :class="isDark ? 'text-white' : 'text-neutral-900'">
      {{ formatted }}<span v-if="unit" class="ml-0.5 text-sm font-medium" :class="isDark ? 'text-primary-olive-light' : 'text-neutral-500'">{{ unit }}</span>
    </p>
    <p v-if="sub" class="truncate text-xs" :class="isDark ? 'text-primary-olive-light' : 'text-neutral-500'">{{ sub }}</p>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — compact counting-up KPI for the Operator Home hero cards (ticket 0018), on the dark or the light card.
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
    isDark?: boolean;
  }>(),
  { decimals: 0, unit: undefined, sub: undefined },
);

// variables
const display = useCountUp(toRef(props, 'value'));

// computed
const formatted = computed((): string =>
  display.value.toLocaleString('fr-FR', { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals }),
);
</script>
