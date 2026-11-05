<template>
  <div class="card lift flex min-w-0 flex-col gap-1.5 p-5">
    <p class="eyebrow">{{ label }}</p>
    <p class="text-display-xs figure sm:text-display-sm" :class="valueClass">
      <span v-count-up="{ value, format: formatValue }" /><span v-if="unit" class="ms-1 text-md font-medium text-fg-secondary-paragraph">{{ unit }}</span>
    </p>
    <p v-if="sub" class="body-two">{{ sub }}</p>
    <p v-if="delta" class="flex items-center gap-1 text-xs font-medium" :class="isDeltaGood ? 'text-fg-success' : 'text-fg-danger'">
      {{ delta }} <span class="font-normal text-fg-secondary-paragraph">{{ deltaLabel }}</span>
    </p>
    <ui-progress-bar v-if="progress !== undefined" class="mt-1 h-1.5" :value="progress" :label="label" />
  </div>
</template>

<script setup lang="ts">
// imports
import { formatNumber } from 'global/composables/number';

import UiProgressBar from 'global/components/ui-progress-bar.vue';

// props
const props = withDefaults(
  defineProps<{
    label: string;
    value: number;
    decimals?: number;
    format?: (value: number) => string;
    unit?: string;
    sub?: string;
    delta?: string;
    deltaLabel?: string;
    isDeltaGood?: boolean;
    progress?: number;
    valueClass?: string;
  }>(),
  { decimals: 0, format: undefined, unit: undefined, sub: undefined, delta: undefined, deltaLabel: undefined, progress: undefined, valueClass: 'text-fg-display' },
);

// methods
const formatValue = (value: number): string => (props.format ? props.format(value) : formatNumber(value, props.decimals, props.decimals));
</script>
