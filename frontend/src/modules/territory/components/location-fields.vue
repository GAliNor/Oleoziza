<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col gap-2" data-field="province">
      <p class="label">{{ $t('territory.fields.area') }}</p>
      <div class="h-72 overflow-hidden rounded-card border border-default bg-subtle sm:h-80">
        <province-map v-if="isMapShown" is-selectable :province-id="modelValue.province" @select="handleProvince" />
      </div>
      <p class="body-three">{{ $t('territory.fields.areaHint') }}</p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          v-for="province in territoryStore.provinces"
          :key="province.id"
          type="button"
          class="toggle-tile px-2"
          :class="{ 'toggle-tile-active': modelValue.province === province.id }"
          :aria-pressed="modelValue.province === province.id"
          @click="handleProvince(province.id)"
        >
          {{ province.name }}
        </button>
      </div>
      <p v-if="errors?.province" class="form-error" role="alert">{{ errors.province }}</p>
    </div>

    <ui-field v-slot="{ id, describedBy, isInvalid }" name="city" :label="$t('territory.fields.city')" :error="errors?.city" @leave="emit('leave', 'city')">
      <input :id="id" class="input" type="text" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" :value="modelValue.city" :placeholder="$t('territory.fields.cityPlaceholder')" @input="handleCityInput" />
      <div v-if="province" class="flex flex-wrap gap-2">
        <button
          v-for="city in province.cities"
          :key="city"
          type="button"
          class="choice-chip"
          :class="{ 'choice-chip-active': isSameCity(city, modelValue.city) }"
          :aria-pressed="isSameCity(city, modelValue.city)"
          @click="handleCity(city)"
        >
          {{ city }}
        </button>
      </div>
    </ui-field>

    <ui-field v-slot="{ id, describedBy, isInvalid }" name="address" :label="$t('territory.fields.address')" :error="errors?.address" @leave="emit('leave', 'address')">
      <input :id="id" class="input" type="text" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" :value="modelValue.address" :placeholder="$t('territory.fields.addressPlaceholder')" @input="handleAddress" />
    </ui-field>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, defineAsyncComponent, onMounted } from 'vue';

import { isSameCity, withCity, withProvince } from 'territory/composables/location';
import { useTerritoryStore } from 'territory/stores/territory';
import type { ILocation, IProvince, ProvinceId } from 'territory/types/territory';

import UiField from 'global/components/ui-field.vue';

// props
const props = withDefaults(defineProps<{ modelValue: ILocation; isMapShown?: boolean; errors?: Partial<Record<keyof ILocation, string | null>> }>(), { isMapShown: true });

// emits
const emit = defineEmits<{ (event: 'update:modelValue', location: ILocation): void; (event: 'leave', field: keyof ILocation): void }>();

// stores
const territoryStore = useTerritoryStore();

// variables
const ProvinceMap = defineAsyncComponent(() => import('territory/components/province-map.vue'));

// computed
const province = computed((): IProvince | undefined => territoryStore.findProvince(props.modelValue.province));

// event handlers
const handleProvince = (id: ProvinceId): void => {
  emit('update:modelValue', withProvince(territoryStore.provinces, props.modelValue, id));
};

const handleCity = (city: string): void => {
  emit('update:modelValue', withCity(territoryStore.provinces, props.modelValue, city));
};

const handleCityInput = (event: Event): void => {
  handleCity((event.target as HTMLInputElement).value);
};

const handleAddress = (event: Event): void => {
  emit('update:modelValue', { ...props.modelValue, address: (event.target as HTMLInputElement).value });
};

// lifecycle
onMounted(() => territoryStore.fetchProvinces());
</script>
