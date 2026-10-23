<template>
  <div class="flex flex-col gap-3">
    <div v-if="modelValue && !isPicking" class="flex items-center gap-3 rounded-2xl border border-primary-olive-mid bg-primary-olive-light/40 p-3">
      <span class="avatar bg-primary-olive-dark text-white">{{ initials(modelValue.name) }}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-neutral-900">{{ modelValue.name }}</p>
        <p class="body-two truncate">
          {{ formatPhone(modelValue.phone) }} · {{ $t(`reception.clientKinds.${modelValue.kind}`) }}
          <span v-if="modelValue.isPendingSync" class="chip ml-1 bg-info-blue/10 text-info-blue">{{ $t('reception.clientPicker.new') }}</span>
        </p>
        <p v-if="otherSites.length" class="text-xs text-accent-brown">
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
            class="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-left transition-colors
              hover:border-primary-olive-mid"
            @click="handlePick(client)"
          >
            <span class="avatar bg-neutral-100 text-neutral-600">{{ initials(client.name) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-neutral-900">{{ client.name }}</span>
              <span class="body-two block truncate">{{ formatPhone(client.phone) }}</span>
            </span>
            <span v-if="client.kind === 'company'" class="chip bg-accent-sand/30 text-accent-brown">{{ $t('reception.clientKinds.company') }}</span>
          </button>
        </li>
      </ul>
      <p v-if="query && !results.length" class="body-two">{{ $t('reception.clientPicker.noResult', { query }) }}</p>
      <button v-if="canCreate" type="button" class="btn-secondary" @click="handleStartCreate">
        <user-add-line-icon class="h-5 w-5" />
        {{ query && !results.length ? $t('reception.clientPicker.createNamed', { query }) : $t('reception.clientPicker.create') }}
      </button>
    </template>

    <form v-else class="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4" @submit.prevent="handleCreate">
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

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useClientStore } from 'global/stores/client';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { formatPhone, normalizePhone } from 'global/composables/phone';
import type { ClientKind, IClient } from 'global/types/client';

import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';

// props
const props = defineProps<{ modelValue: IClient | null; siteId: string }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', client: IClient): void }>();

// stores
const authStore = useAuthStore();
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

// computed
const results = computed((): IClient[] => clientStore.searchClients(query.value));
const canCreate = computed((): boolean => authStore.can('client.create'));
const canSubmitNew = computed((): boolean => !!newName.value.trim() && normalizePhone(newPhone.value) !== null);
const otherSites = computed((): string[] =>
  (props.modelValue?.siteIds ?? [])
    .filter((siteId) => siteId !== props.siteId)
    .map((siteId) => siteStore.sites.find((site) => site.id === siteId)?.city ?? '')
    .filter(Boolean),
);

// methods
const initials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

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
  isCreating.value = true;
};

const handleCreate = async (): Promise<void> => {
  const phone = normalizePhone(newPhone.value);
  if (!phone) return;
  const client = await clientStore.createClient(newKind.value, newName.value.trim(), phone, props.siteId);
  if (!client) return;
  pickClient(client);
  isCreating.value = false;
};
</script>
