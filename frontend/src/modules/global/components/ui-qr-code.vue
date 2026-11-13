<template>
  <svg :viewBox="`-${QUIET_ZONE} -${QUIET_ZONE} ${qrComputed.size + QUIET_ZONE * 2} ${qrComputed.size + QUIET_ZONE * 2}`" role="img" :aria-label="label" shape-rendering="crispEdges">
    <rect :x="-QUIET_ZONE" :y="-QUIET_ZONE" :width="qrComputed.size + QUIET_ZONE * 2" :height="qrComputed.size + QUIET_ZONE * 2" class="fill-white" />
    <path :d="qrComputed.path" class="fill-neutral-900" />
  </svg>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { renderQrSvg, type IQrSvg } from '~/plugins/lean-qr';

// props
const props = defineProps<{ value: string; label: string }>();

// variables
const QUIET_ZONE = 2;

// computed
const qrComputed = computed((): IQrSvg => renderQrSvg(props.value));
</script>
