<template>
  <div
    ref="frame"
    class="province-map relative h-full w-full"
    role="img"
    :aria-label="province ? $t('client.coordinates.mapLabel', { name: province.name }) : $t('client.coordinates.mapLabelNone')"
  >
    <div v-if="isUnavailable" class="flex h-full items-center justify-center p-6">
      <p class="body-two text-center">{{ $t('client.coordinates.mapUnavailable') }}</p>
    </div>
    <map-view v-else />
    <map-marker v-for="item in otherProvinces" :key="item.id" :lng-lat="item.labelAt">
      <span class="text-xs whitespace-nowrap text-fg-secondary-paragraph">{{ item.name }}</span>
    </map-marker>
    <span
      v-if="province && !isUnavailable"
      class="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-surface py-1.5 pr-3.5 pl-2.5 text-xs font-semibold whitespace-nowrap text-fg-display shadow-overlay"
    >
      <map-pin-line-icon class="h-4 w-4 text-fg-place" />
      {{ province.name }}
    </span>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { MapMarker, MapView, useMap, useMapLayer, type IFeatureCollection } from 'map';

import { readCssToken } from 'global/composables/css-token';
import { ORIENTAL_BOUNDS, ORIENTAL_PROVINCES } from 'client/constants/provinces';
import ORIENTAL_GEOJSON from 'client/constants/oriental-provinces.json';
import type { IProvince, ProvinceId } from 'client/types/client';

import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// props
const props = defineProps<{ provinceId: ProvinceId | null }>();

// stores
const map = useMap();

// variables
const PROVINCE_SHAPES = ORIENTAL_GEOJSON as unknown as IFeatureCollection;
const frame = useTemplateRef<HTMLElement>('frame');
const isUnavailable = ref(false);
let resizeObserver: ResizeObserver | null = null;

// computed
const province = computed((): IProvince | undefined => ORIENTAL_PROVINCES.find((item) => item.id === props.provinceId));
const otherProvinces = computed((): IProvince[] => ORIENTAL_PROVINCES.filter((item) => item.id !== props.provinceId));

// methods
const highlightOf = (id: ProvinceId | null): IFeatureCollection => ({ type: 'FeatureCollection', features: PROVINCE_SHAPES.features.filter((feature) => feature.properties.id === id) });

const frameRegion = (): void => {
  map.camera.fitBounds(ORIENTAL_BOUNDS, { duration: 0 });
};

useMapLayer({
  id: 'oriental-provinces',
  data: PROVINCE_SHAPES,
  symbols: {
    fill: { color: readCssToken('--background-color-emphasis') },
    line: { color: readCssToken('--background-color-surface'), width: 1.5 },
  },
});

const highlight = useMapLayer({
  id: 'client-province',
  zIndex: 1,
  data: highlightOf(props.provinceId),
  symbols: {
    fill: { color: readCssToken('--background-color-action') },
    line: { color: readCssToken('--background-color-surface'), width: 1.5 },
  },
});

const stopErrors = map.on('error', () => {
  if (!map.getState().isReady) isUnavailable.value = true;
});

// watchers
watch(
  () => props.provinceId,
  (id) => highlight.setData(highlightOf(id)),
);

// event handlers
const handleResize = (): void => {
  requestAnimationFrame(frameRegion);
};

// lifecycle
onMounted(() => {
  frameRegion();
  resizeObserver = new ResizeObserver(handleResize);
  if (frame.value) resizeObserver.observe(frame.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  stopErrors();
});
</script>

<style scoped>
/* MapLibre's stylesheet is unlayered, so a utility class cannot override its typeface. */
.province-map :deep(.maplibregl-map) {
  font-family: inherit;
}
</style>
