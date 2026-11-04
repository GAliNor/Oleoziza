<template>
  <section class="flex flex-col gap-4">
    <template v-if="!created">
      <header class="flex items-center justify-between">
        <h2 class="heading-three">{{ $t('dashboard.operator.quickClient.title') }}</h2>
        <button type="button" class="link" @click="handleClose">{{ closeLabel }}</button>
      </header>
      <div class="flex items-center gap-3">
        <ui-avatar class="h-16 w-16" :name="name.trim() || $t('dashboard.operator.quickClient.placeholderAvatar')" :variant="clientAvatarVariant(kind)" />
        <div class="grid flex-1 grid-cols-2 gap-2">
          <button type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === 'individual' }" @click="kind = 'individual'">{{ $t('dashboard.operator.quickClient.individual') }}</button>
          <button type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === 'company' }" @click="kind = 'company'">{{ $t('dashboard.operator.quickClient.company') }}</button>
        </div>
      </div>
      <input v-model="name" class="input" :placeholder="$t(kind === 'company' ? 'dashboard.operator.quickClient.companyName' : 'dashboard.operator.quickClient.fullName')" />
      <input v-model="phone" class="input" type="tel" inputmode="tel" :placeholder="$t('dashboard.operator.quickClient.phone')" />
      <button type="button" class="btn-primary min-h-14 text-md" :disabled="!canSave" @click="handleSave">{{ $t('dashboard.operator.quickClient.create') }}</button>
    </template>

    <template v-else>
      <div class="flex flex-col items-center gap-2 py-2 text-center">
        <ui-avatar class="h-20 w-20" :name="created.name" :variant="clientAvatarVariant(created.kind)" />
        <p class="heading-three">{{ created.name }}</p>
        <p class="body-two">{{ $t('dashboard.operator.quickClient.created') }}</p>
      </div>
      <button type="button" class="btn-primary min-h-14 text-md" @click="handleReceive">{{ $t('dashboard.operator.quickClient.receiveNow') }}</button>
      <button type="button" class="btn-secondary min-h-12" @click="handleClose">{{ $t('dashboard.operator.quickClient.later') }}</button>
    </template>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';

import { useClientStore } from 'client/stores/client';
import { useSiteStore } from 'site/stores/site';
import { createId } from 'global/composables/crypto';
import { normalizePhone } from 'global/composables/phone';
import type { ClientKind, IClient } from 'client/types/client';

import { clientAvatarVariant } from 'client/composables/avatar-variant';
import UiAvatar from 'global/components/ui-avatar.vue';

// props
defineProps<{ closeLabel: string }>();

// emits
const emit = defineEmits<{ close: []; receive: [clientId: string] }>();

// stores
const clientStore = useClientStore();
const siteStore = useSiteStore();

// variables
const kind = ref<ClientKind>('individual');
const name = ref('');
const phone = ref('');
const created = ref<IClient | null>(null);
const clientId = ref(createId());

// computed
const canSave = computed((): boolean => name.value.trim().length > 2 && normalizePhone(phone.value) !== null && !clientStore.isSaving);

// event handlers
const handleSave = async (): Promise<void> => {
  const normalizedPhone = normalizePhone(phone.value);
  if (!normalizedPhone) return;
  created.value = await clientStore.createClient({ id: clientId.value, kind: kind.value, name: name.value.trim(), phone: normalizedPhone, siteId: siteStore.currentSite?.id ?? '' });
};

const handleReceive = (): void => {
  if (created.value) emit('receive', created.value.id);
  handleClose();
};

const handleClose = (): void => {
  name.value = '';
  phone.value = '';
  created.value = null;
  clientId.value = createId();
  emit('close');
};
</script>
