<template>
  <form class="card flex flex-col gap-2 border-warning-subtle bg-warning-subtle" @submit.prevent="handleSave">
    <label class="body-two text-fg-warning" :for="fieldId">{{ $t(`lot.contact.missing.${channel}`) }}</label>
    <div class="flex gap-2">
      <input :id="fieldId" v-model="typed" class="input min-w-0 flex-1" :type="channel === 'email' ? 'email' : 'tel'" :inputmode="channel === 'email' ? 'email' : 'tel'" />
      <button type="submit" class="btn-primary shrink-0" :disabled="!typed.trim() || clientStore.isSaving">{{ $t('lot.contact.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { useId, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useToastStore } from 'global/stores/toast';
import type { ILot, NotificationChoice } from 'lot/types/lot';

// props
const props = defineProps<{ lot: ILot; channel: Exclude<NotificationChoice, 'none'> }>();

// stores
const { t } = useI18n();
const clientStore = useClientStore();
const lotStore = useLotStore();
const toastStore = useToastStore();

// variables
const fieldId = useId();
const typed = ref('');

// event handlers
const handleSave = async (): Promise<void> => {
  const updated = await clientStore.updateContact(props.lot.clientId, props.channel === 'email' ? { email: typed.value.trim() } : { phone: typed.value.trim() });
  if (!updated) return;
  await lotStore.clearMissingContact(props.lot);
  toastStore.push(t('lot.contact.saved'), 'success');
};
</script>
