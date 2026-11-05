<template>
  <div
    ref="frame"
    class="province-map relative h-full w-full"
    role="img"
    :aria-label="province ? $t('territory.mapLabel', { name: province.name }) : $t('territory.mapLabelNone')"
  >
    <div v-if="isUnavailable" class="flex h-full items-center justify-center p-6">
      <p class="body-two text-center">{{ $t('territory.mapUnavailable') }}</p>
    </div>
    <map-view v-else />
    <map-marker v-for="item in otherProvinces" :key="item.id" :lng-lat="item.labelAt">
      <span class="pointer-events-none text-xs whitespace-nowrap text-fg-secondary-paragraph">{{ item.name }}</span>
    </map-marker>
    <span
      v-if="province && !isUnavailable"
      class="absolute bottom-3 inset-s-3 z-10 flex items-center gap-1.5 rounded-full bg-surface py-1.5 pe-3.5 ps-2.5 text-xs font-semibold whitespace-nowrap text-fg-display shadow-overlay"
    >
      <map-pin-line-icon class="h-4 w-4 text-fg-place" />
      {{ province.name }}
    </span>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { MapMarker, MapView, useMap, useMapLayer, type IFeature, type IFeatureCollection } from 'map';

import { readCssToken } from 'global/composables/css-token';
import { provinceById } from 'territory/composables/location';
import { ORIENTAL_BOUNDS, ORIENTAL_PROVINCES } from 'territory/constants/provinces';
import ORIENTAL_GEOJSON from 'territory/constants/oriental-provinces.json';
import type { IProvince, ProvinceId } from 'territory/types/territory';

import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// props
const props = withDefaults(defineProps<{ provinceId: ProvinceId | null; isSelectable?: boolean }>(), { isSelectable: false });

// emits
const emit = defineEmits<{ (event: 'select', province: ProvinceId): void }>();

// stores
const map = useMap();

// variables
const PROVINCE_SHAPES = ORIENTAL_GEOJSON as unknown as IFeatureCollection;
const frame = useTemplateRef<HTMLElement>('frame');
const isUnavailable = ref(false);
let resizeObserver: ResizeObserver | null = null;

// computed
const province = computed((): IProvince | undefined => provinceById(props.provinceId));
const otherProvinces = computed((): IProvince[] => ORIENTAL_PROVINCES.filter((item) => item.id !== props.provinceId));

// methods
const highlightOf = (id: ProvinceId | null): IFeatureCollection => ({ type: 'FeatureCollection', features: PROVINCE_SHAPES.features.filter((feature) => feature.properties.id === id) });

const frameRegion = (): void => {
  map.camera.fitBounds(ORIENTAL_BOUNDS, { duration: 0 });
};

useMapLayer({
  id: 'oriental-provinces',
  data: PROVINCE_SHAPES,
  featureIdProperty: 'id',
  ...(props.isSelectable ? { onClick: (feature: IFeature) => emit('select', feature.properties.id as ProvinceId) } : {}),
  symbols: {
    fill: { color: readCssToken('--background-color-emphasis'), hover: { color: readCssToken('--background-color-selected') } },
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
