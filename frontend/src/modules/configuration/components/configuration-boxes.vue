<template>
  <article class="card flex flex-col gap-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="heading-five">{{ $t('configuration.boxes.title') }}</h2>
        <p class="body-two">{{ $t('configuration.boxes.hint') }}</p>
      </div>
      <button v-if="!isEditing && !isReadOnly" type="button" class="link shrink-0" :disabled="!isOnline" @click="handleEdit">{{ $t('configuration.edit') }}</button>
    </div>

    <p v-if="!isEditing" class="text-display-xs figure text-fg-display">{{ describe(configuration.boxCount, configuration.boxCapacityKg) }}</p>
    <form v-else class="flex flex-col gap-2" @submit.prevent="handleSave">
      <div class="grid grid-cols-2 gap-2">
        <ui-field v-slot="{ id }" :label="$t('configuration.boxes.count')">
          <input :id="id" v-model.number="count" class="input text-xl figure" type="number" inputmode="numeric" min="1" max="500" step="1" :aria-invalid="!isCountValid" />
        </ui-field>
        <ui-field v-slot="{ id }" :label="$t('configuration.boxes.capacity')">
          <input :id="id" v-model.number="capacityKg" class="input text-xl figure" type="number" inputmode="numeric" min="50" max="5000" step="10" :aria-invalid="!isCapacityValid" />
        </ui-field>
      </div>
      <p v-if="typeof count === 'number' && count < highestBoxInUse" class="form-error">{{ $t('configuration.boxes.inUse', { number: highestBoxInUse }) }}</p>
      <p v-else-if="!isCountValid || !isCapacityValid" class="form-error">{{ $t('configuration.boxes.invalid') }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary" @click="isEditing = false">{{ $t('configuration.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="!canSave">{{ $t('configuration.save') }}</button>
      </div>
    </form>

    <configuration-history v-if="changes.length" :changes="changes" :describe="(change) => describe(change.equipment?.boxCount ?? 0, change.equipment?.boxCapacityKg ?? 0)" />
  </article>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useToastStore } from 'global/stores/toast';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { createId } from 'global/composables/crypto';
import { formatKg } from 'lot/composables/quantity';
import type { IConfiguration, IConfigurationChange } from 'configuration/types/configuration';

import ConfigurationHistory from 'configuration/components/configuration-history.vue';
import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ configuration: IConfiguration; changes: IConfigurationChange[]; highestBoxInUse: number; isReadOnly: boolean }>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const toastStore = useToastStore();
const { isOnline } = useOnlineStatus();

// variables
const isEditing = ref(false);
const count = ref<number | ''>('');
const capacityKg = ref<number | ''>('');
const changeId = ref('');

// computed
const isCountValid = computed((): boolean => typeof count.value === 'number' && Number.isInteger(count.value) && count.value >= Math.max(1, props.highestBoxInUse) && count.value <= 500);
const isCapacityValid = computed((): boolean => typeof capacityKg.value === 'number' && capacityKg.value >= 50 && capacityKg.value <= 5000);
const canSave = computed((): boolean =>
  isCountValid.value && isCapacityValid.value && (count.value !== props.configuration.boxCount || capacityKg.value !== props.configuration.boxCapacityKg) && !configurationStore.isSaving,
);

// methods
const describe = (boxCount: number, boxCapacityKg: number): string => t('configuration.boxes.summary', { count: boxCount, capacity: formatKg(boxCapacityKg) });

// event handlers
const handleEdit = (): void => {
  count.value = props.configuration.boxCount;
  capacityKg.value = props.configuration.boxCapacityKg;
  changeId.value = createId();
  isEditing.value = true;
};

const handleSave = async (): Promise<void> => {
  if (!canSave.value || typeof count.value !== 'number' || typeof capacityKg.value !== 'number') return;
  const updated = await configurationStore.update(props.configuration.siteId, { id: changeId.value, boxes: { count: count.value, capacityKg: capacityKg.value } });
  if (!updated) {
    toastStore.push(t('configuration.saveError'), 'danger');
    return;
  }
  toastStore.push(t('configuration.saved'), 'success');
  isEditing.value = false;
};
</script>
