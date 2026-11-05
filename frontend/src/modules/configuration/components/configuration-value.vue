<template>
  <article class="card flex flex-col gap-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="heading-five">{{ $t(`configuration.values.${setting.key}.title`) }}</h2>
        <p class="body-two">{{ $t(`configuration.values.${setting.key}.hint`) }}</p>
      </div>
      <button v-if="!isEditing && !isReadOnly" type="button" class="link shrink-0" :disabled="!isOnline" @click="handleEdit">{{ $t('configuration.edit') }}</button>
    </div>

    <p v-if="!isEditing" class="text-display-xs figure text-fg-display">{{ formatted(value) }}</p>
    <form v-else class="flex flex-col gap-2" @submit.prevent="handleSave">
      <div class="relative">
        <input
          v-model.number="draft"
          class="input pe-20 text-xl figure"
          type="number"
          inputmode="decimal"
          :min="setting.min"
          :max="setting.max"
          :step="setting.step"
          :aria-label="$t(`configuration.values.${setting.key}.title`)"
          :aria-invalid="!isDraftValid"
        />
        <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t(`configuration.units.${setting.unitKey}`) }}</span>
      </div>
      <p v-if="!isDraftValid" class="form-error">{{ $t('configuration.outOfRange', { min: setting.min, max: setting.max }) }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary" @click="isEditing = false">{{ $t('configuration.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="!isDraftValid || draft === value || configurationStore.isSaving">{{ $t('configuration.save') }}</button>
      </div>
    </form>

    <configuration-history v-if="changes.length" :changes="changes" :describe="(change) => formatted(change.value ?? 0)" />
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
import { formatNumber } from 'global/composables/number';
import type { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import type { IConfigurationChange } from 'configuration/types/configuration';

import ConfigurationHistory from 'configuration/components/configuration-history.vue';

// props
const props = defineProps<{ setting: (typeof CONFIGURATION_VALUES)[number]; siteId: string; value: number; changes: IConfigurationChange[]; isReadOnly: boolean }>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const toastStore = useToastStore();
const { isOnline } = useOnlineStatus();

// variables
const isEditing = ref(false);
const draft = ref<number | ''>('');
const changeId = ref('');

// computed
const isDraftValid = computed((): boolean => typeof draft.value === 'number' && draft.value >= props.setting.min && draft.value <= props.setting.max);

// methods
const formatted = (amount: number): string => `${formatNumber(amount, 2, props.setting.step < 1 ? 2 : 0)} ${t(`configuration.units.${props.setting.unitKey}`)}`;

// event handlers
const handleEdit = (): void => {
  draft.value = props.value;
  changeId.value = createId();
  isEditing.value = true;
};

const handleSave = async (): Promise<void> => {
  if (!isDraftValid.value || typeof draft.value !== 'number') return;
  const updated = await configurationStore.update(props.siteId, { id: changeId.value, value: { key: props.setting.key, amount: draft.value } });
  if (!updated) {
    toastStore.push(t('configuration.saveError'), 'danger');
    return;
  }
  toastStore.push(t('configuration.saved'), 'success');
  isEditing.value = false;
};
</script>
