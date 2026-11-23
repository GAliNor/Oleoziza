<template>
  <ul class="flex flex-col divide-y divide-subtle">
    <li v-for="method in methods" :key="method.key" class="grid items-center gap-x-4 px-2 py-1 @md:grid-cols-[7rem_minmax(0,1fr)]">
      <span class="flex min-h-9 items-center text-sm font-medium text-fg-display">{{ $t(`finance.methods.${method.key}`) }}</span>
      <div class="flex flex-wrap gap-x-6">
        <button
          v-for="field in FIELDS"
          :key="field"
          type="button"
          role="switch"
          class="flex min-h-11 cursor-pointer items-center gap-3 rounded-control text-start text-sm text-fg-primary-paragraph focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed"
          :aria-checked="shownOf(method)[field]"
          :disabled="!!reasonOf(method, field)"
          :title="reasonOf(method, field) ?? undefined"
          @click="handleToggle(method, field)"
        >
          <ui-switch :is-on="shownOf(method)[field]" :is-pending="pending?.key === method.key && pending[field] !== method[field]" />
          {{ $t(field === 'isEnabled' ? 'configuration.methods.enabled' : 'configuration.methods.proof') }}
        </button>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { createId } from 'global/composables/crypto';
import type { IPaymentMethodSetting } from 'configuration/types/configuration';

import UiSwitch from 'global/components/ui-switch.vue';

type MethodField = 'isEnabled' | 'needsProof';

// props
const props = defineProps<{ siteId: string; methods: IPaymentMethodSetting[]; lockReason: string | null }>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();

// variables
const FIELDS: readonly MethodField[] = ['isEnabled', 'needsProof'];
/** The method as just asked for: the switch moves at once, and comes back if the change is refused. */
const pending = ref<IPaymentMethodSetting | null>(null);

// methods
const shownOf = (method: IPaymentMethodSetting): IPaymentMethodSetting => (pending.value?.key === method.key ? pending.value : method);

const reasonOf = (method: IPaymentMethodSetting, field: MethodField): string | null => {
  if (props.lockReason) return props.lockReason;
  const isLastOne = field === 'isEnabled' && method.isEnabled && props.methods.filter((item) => item.isEnabled).length === 1;
  return isLastOne ? t('configuration.methods.lastOne') : null;
};

// event handlers
const handleToggle = async (method: IPaymentMethodSetting, field: MethodField): Promise<void> => {
  if (configurationStore.isSaving) return;
  pending.value = { ...method, [field]: !method[field] };
  await configurationStore.update(props.siteId, { id: createId(), method: pending.value });
  pending.value = null;
};
</script>
