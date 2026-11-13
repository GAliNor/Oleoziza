<template>
  <div
    class="relative h-full w-full p-5"
    :role="isSelectable ? 'group' : 'img'"
    :aria-label="province ? $t('territory.mapLabel', { name: province.name }) : $t('territory.mapLabelNone')"
  >
    <div class="province-map-box h-full w-full">
      <div class="absolute inset-0 m-auto" :style="frameStyle">
        <svg class="absolute inset-0 h-full w-full overflow-visible" :viewBox="`0 0 ${PROVINCE_SHAPES.width} ${PROVINCE_SHAPES.height}`" aria-hidden="false">
          <path
            v-for="shape in orderedShapesComputed"
            :key="shape.id"
            :d="shape.path"
            class="stroke-(--background-color-surface) outline-none transition-[fill] duration-200 ease-(--ease-premium)"
            :class="pathClass(shape.id)"
            stroke-width="1.5"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
            :role="isSelectable ? 'button' : undefined"
            :tabindex="isSelectable ? 0 : undefined"
            :aria-label="isSelectable ? shape.name : undefined"
            :aria-pressed="isSelectable ? shape.id === provinceId : undefined"
            @click="handleSelect(shape.id)"
            @keydown.enter.prevent="handleSelect(shape.id)"
            @keydown.space.prevent="handleSelect(shape.id)"
          />
        </svg>
        <span
          v-for="shape in PROVINCE_SHAPES.shapes"
          :key="shape.id"
          class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-xs whitespace-nowrap transition-colors duration-200"
          :class="shape.id === provinceId ? 'rounded-full bg-action px-2 py-0.5 font-semibold text-fg-on-action shadow-raised' : 'text-fg-secondary-paragraph'"
          :style="{ left: `${shape.labelLeft}%`, top: `${shape.labelTop}%` }"
          aria-hidden="true"
        >
          {{ shape.name }}
        </span>
      </div>
    </div>
    <span class="absolute bottom-1.5 inset-e-2 text-[0.625rem] text-fg-muted">© OpenStreetMap</span>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { provinceById } from 'territory/composables/location';
import { PROVINCE_SHAPES, type IProvinceShape } from 'territory/composables/province-shapes';
import type { IProvince, ProvinceId } from 'territory/types/territory';

// props
const props = withDefaults(defineProps<{ provinceId: ProvinceId | null; isSelectable?: boolean }>(), { isSelectable: false });

// emits
const emit = defineEmits<{ (event: 'select', province: ProvinceId): void }>();

// variables
const RATIO = PROVINCE_SHAPES.width / PROVINCE_SHAPES.height;
const frameStyle = { aspectRatio: `${RATIO}`, width: `min(100cqw, 100cqh * ${RATIO})` };

// computed
const province = computed((): IProvince | undefined => provinceById(props.provinceId));
const orderedShapesComputed = computed((): IProvinceShape[] => [
  ...PROVINCE_SHAPES.shapes.filter((shape) => shape.id !== props.provinceId),
  ...PROVINCE_SHAPES.shapes.filter((shape) => shape.id === props.provinceId),
]);

// methods
const pathClass = (id: ProvinceId): string[] => {
  if (id === props.provinceId) return ['fill-(--background-color-action)'];
  if (!props.isSelectable) return ['fill-(--background-color-emphasis)'];
  return ['cursor-pointer fill-(--background-color-emphasis) hover:fill-(--background-color-selected) focus-visible:fill-(--background-color-selected)'];
};

// event handlers
const handleSelect = (id: ProvinceId): void => {
  if (props.isSelectable) emit('select', id);
};
</script>

<style scoped>
.province-map-box {
  position: relative;
  container-type: size;
}
</style>
