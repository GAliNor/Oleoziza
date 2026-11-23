<template>
  <ui-property :label="$t('configuration.boxes.size')" :is-locked="!!lockReason" :lock-reason="lockReason ?? undefined" :is-empty="!configuration.boxCount" :empty-label="$t('configuration.boxes.none')" :problem="problemComputed" :save="save" is-explicit :action-label="$t('configuration.price.change')" @start="handleStart">
    <span class="figure">{{ $t('configuration.boxes.summary', { count: configuration.boxCount, capacity: formatKg(configuration.boxCapacityKg) }) }}</span>
    <template #editor>
      <div class="flex flex-wrap items-center gap-2">
        <input v-model.number="count" class="input min-h-11 max-w-24 figure" type="number" inputmode="numeric" min="0" max="500" step="1" :aria-label="$t('configuration.boxes.count')" />
        <span class="body-two">{{ $t('configuration.boxes.of') }}</span>
        <input v-model.number="capacityKg" class="input min-h-11 max-w-28 figure" type="number" inputmode="numeric" min="50" max="5000" step="10" :aria-label="$t('configuration.boxes.capacity')" />
        <span class="body-two">{{ $t('global.units.kilogram') }}</span>
      </div>
    </template>
  </ui-property>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { createId } from 'global/composables/crypto';
import { formatKg } from 'lot/composables/quantity';
import type { IConfiguration } from 'configuration/types/configuration';

import UiProperty from 'global/components/ui-property.vue';

// props
const props = defineProps<{ configuration: IConfiguration; highestBoxInUse: number; lockReason: string | null }>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();

// variables
const count = ref<number | ''>(0);
const capacityKg = ref<number | ''>(0);
const changeId = ref('');

// computed
const isInRange = (value: number | '', min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const problemComputed = computed((): string | null => {
  if (typeof count.value === 'number' && count.value < props.highestBoxInUse) return t('configuration.boxes.inUse', { number: props.highestBoxInUse });
  return isInRange(count.value, 0, 500) && isInRange(capacityKg.value, 50, 5000) ? null : t('configuration.boxes.invalid');
});

// methods
const save = async (): Promise<true | string> => {
  if (typeof count.value !== 'number' || typeof capacityKg.value !== 'number') return problemComputed.value ?? '';
  const updated = await configurationStore.update(props.configuration.siteId, { id: changeId.value, boxes: { count: count.value, capacityKg: capacityKg.value } });
  return updated ? true : t('configuration.saveError');
};

// event handlers
const handleStart = (): void => {
  count.value = props.configuration.boxCount;
  capacityKg.value = props.configuration.boxCapacityKg;
  changeId.value = createId();
};
</script>
