<template>
  <Teleport :to="handle.element">
    <slot />
  </Teleport>
</template>

<script setup lang="ts">
// imports
import { onMounted, onUnmounted, watch } from 'vue';

import { useMap } from '../composables/use-map';
import type { LngLat, PixelPoint } from '../types/geo';
import type { MarkerAnchor } from '../types/marker';

// props
const props = withDefaults(
  defineProps<{
    lngLat: LngLat;
    anchor?: MarkerAnchor;
    offset?: PixelPoint;
    visible?: boolean;
    onClick?: (event: MouseEvent) => void;
  }>(),
  { anchor: 'center', offset: undefined, visible: true, onClick: undefined }
);

// variables
const map = useMap();
const handle = map.markers.add({
  lngLat: props.lngLat,
  anchor: props.anchor,
  offset: props.offset,
  isVisible: props.visible,
  isInteractive: Boolean(props.onClick),
});

// watchers
watch(
  () => props.lngLat,
  (lngLat) => handle.setLngLat(lngLat)
);

watch(
  () => props.visible,
  (isVisible) => handle.setVisible(isVisible)
);

// event handlers
const handleClick = (event: MouseEvent): void => {
  props.onClick?.(event);
};

// lifecycle
onMounted(() => {
  handle.element.addEventListener('click', handleClick);
});

onUnmounted(() => {
  handle.element.removeEventListener('click', handleClick);
  handle.remove();
});
</script>
