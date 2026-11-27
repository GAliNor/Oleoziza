<template>
  <div class="card lift relative isolate flex min-w-0 flex-col gap-1.5 overflow-hidden p-5">
    <img
      v-if="decorationUri"
      :src="decorationUri"
      alt=""
      aria-hidden="true"
      class="decoration pointer-events-none absolute -end-7 -bottom-7 -z-10 h-28 w-28 opacity-[0.09] select-none dark:opacity-[0.14]"
    />
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
import { ref, watch } from 'vue';

import { formatNumber } from 'global/composables/number';
import { renderDecoration } from 'global/composables/decoration';

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

// variables
const decorationUri = ref<string | null>(null);

// methods
const showDecoration = async (): Promise<void> => {
  const seed = props.label;
  try {
    const uri = await renderDecoration(seed);
    if (seed === props.label) decorationUri.value = uri;
  } catch {
    decorationUri.value = null;
  }
};

watch(() => props.label, showDecoration, { immediate: true });

const formatValue = (value: number): string => (props.format ? props.format(value) : formatNumber(value, props.decimals, props.decimals));
</script>

<style scoped>
.decoration {
  animation: decoration-in 900ms var(--ease-premium) backwards;
}

@keyframes decoration-in {
  from {
    opacity: 0;
    transform: rotate(-20deg) scale(0.9);
  }
}

@media (prefers-reduced-motion: reduce) {
  .decoration {
    animation: none;
  }
}
</style>
