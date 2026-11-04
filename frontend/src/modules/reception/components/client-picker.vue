<template>
  <div class="flex flex-col gap-3">
    <div v-if="modelValue && !isPicking" class="flex items-center gap-3 rounded-card border border-brand bg-selected/40 p-3">
      <ui-avatar :name="modelValue.name" fallback-class="bg-action text-fg-on-action" />
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-fg-display">{{ modelValue.name }}</p>
        <p class="body-two truncate">
          {{ formatPhone(modelValue.phone) }} · {{ $t(`reception.clientKinds.${modelValue.kind}`) }}
          <span v-if="modelValue.isPendingSync" class="chip ml-1 bg-info-subtle text-fg-info">{{ $t('reception.clientPicker.new') }}</span>
        </p>
        <p v-if="otherSites.length" class="body-two text-fg-accent">
          {{ $t('reception.clientPicker.otherSites', { sites: otherSites.join(', ') }) }}
        </p>
      </div>
      <button type="button" class="link shrink-0" @click="isPicking = true">{{ $t('reception.clientPicker.change') }}</button>
    </div>

    <template v-else-if="!isCreating">
      <input v-model="query" class="input" type="search" :placeholder="$t('reception.clientPicker.placeholder')" autocomplete="off" />
      <ul class="flex flex-col gap-1.5">
        <li v-for="client in results" :key="client.id">
          <button
            type="button"
            class="flex min-h-14 w-full items-center gap-3 rounded-card border border-default bg-surface px-3 py-2 text-left transition-colors
              hover:border-brand"
            @click="handlePick(client)"
          >
            <client-row :client="client" />
          </button>
        </li>
      </ul>
      <p v-if="query && !results.length" class="body-two">{{ $t('reception.clientPicker.noResult', { query }) }}</p>
      <button v-if="canCreate" type="button" class="btn-secondary" @click="handleStartCreate">
        <user-add-line-icon class="h-5 w-5" />
        {{ query && !results.length ? $t('reception.clientPicker.createNamed', { query }) : $t('reception.clientPicker.create') }}
      </button>
    </template>

    <form v-else class="flex flex-col gap-3 rounded-card bg-page p-4" @submit.prevent="handleCreate">
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="kind in CLIENT_KINDS"
          :key="kind"
          type="button"
          class="toggle-tile"
          :class="{ 'toggle-tile-active': newKind === kind }"
          @click="newKind = kind"
        >
          {{ $t(`reception.clientKinds.${kind}`) }}
        </button>
      </div>
      <input
        v-model="newName"
        class="input"
        :placeholder="newKind === 'company' ? $t('reception.clientPicker.companyPlaceholder') : $t('reception.clientPicker.namePlaceholder')"
        required
      />
      <input v-model="newPhone" class="input" inputmode="tel" :placeholder="$t('reception.clientPicker.phonePlaceholder')" required />
      <p v-if="!isOnline" class="body-two">{{ $t('reception.clientPicker.offlineHint') }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary" @click="isCreating = false">{{ $t('reception.clientPicker.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="!canSubmitNew || clientStore.isSaving">{{ $t('reception.clientPicker.confirm') }}</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';

import { useSiteStore } from 'site/stores/site';
import { useClientStore } from 'client/stores/client';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { formatPhone, normalizePhone } from 'global/composables/phone';
import { createId } from 'global/composables/crypto';
import type { ClientKind, IClient } from 'client/types/client';

import ClientRow from 'client/components/client-row.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';

// props
const props = defineProps<{ modelValue: IClient | null; siteId: string }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', client: IClient): void }>();

// stores
const siteStore = useSiteStore();
const clientStore = useClientStore();

// variables
const CLIENT_KINDS: ClientKind[] = ['individual', 'company'];
const { isOnline } = useOnlineStatus();
const query = ref('');
const isPicking = ref(false);
const isCreating = ref(false);
const newKind = ref<ClientKind>('individual');
const newName = ref('');
const newPhone = ref('');
const newClientId = ref(createId());

// computed
const results = computed((): IClient[] => clientStore.searchClients(query.value));
const canCreate = computed((): boolean => siteStore.can('client.create'));
const canSubmitNew = computed((): boolean => !!newName.value.trim() && normalizePhone(newPhone.value) !== null);
const otherSites = computed((): string[] =>
  (props.modelValue?.siteIds ?? [])
    .filter((siteId) => siteId !== props.siteId)
    .map((siteId) => siteStore.sites.find((site) => site.id === siteId)?.city ?? '')
    .filter(Boolean),
);

// methods
const pickClient = (client: IClient): void => {
  emit('update:modelValue', client);
  isPicking.value = false;
  query.value = '';
};

// event handlers
const handlePick = (client: IClient): void => {
  pickClient(client);
};

const handleStartCreate = (): void => {
  const isPhone = /\d{3,}/.test(query.value);
  newName.value = isPhone ? '' : query.value.trim();
  newPhone.value = isPhone ? query.value.trim() : '';
  newClientId.value = createId();
  isCreating.value = true;
};

const handleCreate = async (): Promise<void> => {
  const phone = normalizePhone(newPhone.value);
  if (!phone) return;
  const client = await clientStore.createClient({ id: newClientId.value, kind: newKind.value, name: newName.value.trim(), phone, siteId: props.siteId });
  if (!client) return;
  pickClient(client);
  isCreating.value = false;
};
</script>
