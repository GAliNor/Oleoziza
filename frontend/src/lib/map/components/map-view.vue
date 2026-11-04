<template>
  <div ref="container" class="map-view" />
</template>

<script setup lang="ts">
// imports
import { onMounted, onUnmounted, ref } from 'vue';

import { useMapInternal } from '../composables/use-map';

// variables
const controller = useMapInternal();
const container = ref<HTMLElement | null>(null);

// lifecycle
onMounted(() => {
  if (container.value) controller.mount(container.value);
});

onUnmounted(() => {
  controller.unmount();
});
</script>

<style scoped>
.map-view {
  width: 100%;
  height: 100%;
}
</style>
