<template>
  <article class="card flex flex-col gap-3">
    <div>
      <h2 class="heading-five">{{ $t('configuration.methods.title') }}</h2>
      <p class="body-two">{{ $t('configuration.methods.hint') }}</p>
    </div>
    <ul class="flex flex-col divide-y divide-subtle">
      <li v-for="method in methods" :key="method.key" class="flex flex-col gap-1 py-2">
        <p class="label text-fg-display">{{ $t(`finance.methods.${method.key}`) }}</p>
        <div class="grid gap-x-4 sm:grid-cols-2">
          <button
            type="button"
            role="switch"
            class="flex min-h-11 items-center gap-3 rounded-lg text-start text-sm disabled:cursor-not-allowed"
            :aria-checked="method.isEnabled"
            :disabled="isLocked || isLastEnabled(method)"
            :title="isLastEnabled(method) ? $t('configuration.methods.lastOne') : undefined"
            @click="handleChange({ ...method, isEnabled: !method.isEnabled })"
          >
            <ui-switch :is-on="method.isEnabled" />
            {{ $t('configuration.methods.enabled') }}
          </button>
          <button
            type="button"
            role="switch"
            class="flex min-h-11 items-center gap-3 rounded-lg text-start text-sm disabled:cursor-not-allowed"
            :aria-checked="method.needsProof"
            :disabled="isLocked"
            @click="handleChange({ ...method, needsProof: !method.needsProof })"
          >
            <ui-switch :is-on="method.needsProof" />
            {{ $t('configuration.methods.proof') }}
          </button>
        </div>
      </li>
    </ul>
    <configuration-history v-if="changes.length" :changes="changes" :describe="describe" />
  </article>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useToastStore } from 'global/stores/toast';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { createId } from 'global/composables/crypto';
import type { IConfigurationChange, IPaymentMethodSetting } from 'configuration/types/configuration';

import UiSwitch from 'global/components/ui-switch.vue';
import ConfigurationHistory from 'configuration/components/configuration-history.vue';

// props
const props = defineProps<{ siteId: string; methods: IPaymentMethodSetting[]; changes: IConfigurationChange[]; isReadOnly: boolean }>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const toastStore = useToastStore();
const { isOnline } = useOnlineStatus();

// computed
const isLocked = computed((): boolean => props.isReadOnly || !isOnline.value || configurationStore.isSaving);

// methods
const isLastEnabled = (method: IPaymentMethodSetting): boolean => method.isEnabled && props.methods.filter((item) => item.isEnabled).length === 1;

const describe = (change: IConfigurationChange): string => {
  const state = change.method?.isEnabled ? t('configuration.history.methodOn') : t('configuration.history.methodOff');
  const proof = change.method?.needsProof ? t('configuration.history.proofOn') : t('configuration.history.proofOff');
  return `${t(`finance.methods.${change.key}`)} : ${state}, ${proof}`;
};

// event handlers
const handleChange = async (method: IPaymentMethodSetting): Promise<void> => {
  const updated = await configurationStore.update(props.siteId, { id: createId(), method });
  toastStore.push(t(updated ? 'configuration.saved' : 'configuration.saveError'), updated ? 'success' : 'danger');
};
</script>
