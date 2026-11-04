<template>
  <section class="flex flex-col gap-4">
    <template v-if="!created">
      <h1 class="heading-one">{{ $t('client.quick.title') }}</h1>
      <div class="flex items-center gap-3">
        <ui-avatar class="h-16 w-16 shrink-0" :name="name.trim() || $t('client.quick.placeholderAvatar')" :variant="clientAvatarVariant(kind)" />
        <div class="grid flex-1 grid-cols-2 gap-2">
          <button type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === 'individual' }" @click="kind = 'individual'">{{ $t('client.quick.individual') }}</button>
          <button type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === 'company' }" @click="kind = 'company'">{{ $t('client.quick.company') }}</button>
        </div>
      </div>
      <ui-field v-slot="{ id }" :label="$t(kind === 'company' ? 'client.quick.companyName' : 'client.quick.fullName')">
        <input :id="id" v-model="name" class="input" type="text" autocomplete="off" />
      </ui-field>
      <ui-field v-slot="{ id }" :label="$t('client.quick.phoneLabel')">
        <input :id="id" v-model="phone" class="input" type="tel" inputmode="tel" :placeholder="$t('client.quick.phone')" />
      </ui-field>
      <ui-field v-slot="{ id }" :label="$t(`client.quick.identifier.${kind}`)">
        <input
          :id="id"
          v-model="identifier"
          class="input tabular-nums"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          :inputmode="kind === 'company' ? 'numeric' : 'text'"
          :placeholder="$t(`client.quick.identifierPlaceholder.${kind}`)"
          :aria-invalid="isIdentifierInvalid"
        />
        <p v-if="isIdentifierInvalid" class="form-error">{{ $t(`client.quick.identifierInvalid.${kind}`) }}</p>
        <div v-if="duplicate" class="flex flex-col gap-3 rounded-card bg-warning-subtle p-4" role="status">
          <p class="min-w-0">
            <span class="block text-sm font-semibold text-fg-display">{{ $t(`client.quick.duplicate.${kind}`, { name: duplicate.name }) }}</span>
            <span class="body-two block tabular-nums">{{ formatPhone(duplicate.phone) }}</span>
          </p>
          <div class="grid gap-2 sm:grid-cols-2">
            <router-link class="btn-secondary min-h-14 bg-surface px-3 hover:bg-surface" :to="{ name: 'client-page', params: { id: duplicate.id } }">{{ $t('client.quick.openDuplicate') }}</router-link>
            <button v-if="canReceive" type="button" class="btn-primary min-h-14 px-3" @click="handleUseDuplicate(duplicate.id)">{{ $t('client.quick.receiveDuplicate') }}</button>
          </div>
        </div>
      </ui-field>
      <ui-field v-slot="{ id }" :label="$t('client.quick.email')">
        <input :id="id" v-model="email" class="input" type="email" inputmode="email" autocomplete="off" :aria-invalid="isEmailInvalid" />
        <p v-if="isEmailInvalid" class="form-error">{{ $t('client.quick.emailInvalid') }}</p>
      </ui-field>
      <location-fields v-model="location" :is-map-shown="isActive" />
      <p v-if="!isOnline" class="body-two">{{ $t('client.quick.offlineHint') }}</p>
      <div class="flex flex-col gap-2">
        <button type="button" class="min-h-14 text-md" :class="duplicate ? 'btn-secondary' : 'btn-primary'" :disabled="!canSave" @click="handleSave">
          {{ $t(duplicate ? 'client.quick.createAnyway' : 'client.quick.create') }}
        </button>
        <p v-if="missing.length" class="body-two text-center">{{ $t('client.quick.missing', { items: missing.join(', ') }) }}</p>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col items-center gap-2 py-2 text-center">
        <ui-avatar class="h-20 w-20" :name="created.name" :variant="clientAvatarVariant(created.kind)" />
        <p class="heading-three">{{ created.name }}</p>
        <p class="body-two">{{ $t('client.quick.created') }}</p>
      </div>
      <button type="button" class="btn-primary min-h-14 text-md" @click="handleReceive">{{ $t('client.quick.receiveNow') }}</button>
      <button type="button" class="btn-secondary min-h-14" @click="handleLater">{{ $t('client.quick.later') }}</button>
    </template>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClientStore } from 'client/stores/client';
import { useSiteStore } from 'site/stores/site';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { createId } from 'global/composables/crypto';
import { formatPhone, normalizePhone } from 'global/composables/phone';
import { isEmail, normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import { normalizeClientIdentifier } from 'client/composables/client-identifier';
import { trimmedLocation } from 'territory/composables/location';
import { EMPTY_LOCATION } from 'territory/constants/provinces';
import type { ClientKind, IClient } from 'client/types/client';
import type { ILocation } from 'territory/types/territory';

import UiAvatar from 'global/components/ui-avatar.vue';
import UiField from 'global/components/ui-field.vue';
import LocationFields from 'territory/components/location-fields.vue';

// props
const props = defineProps<{ prefill: string; returnsOnCreate: boolean; isActive: boolean }>();

// emits
const emit = defineEmits<{
  (event: 'receive', clientId: string): void;
  (event: 'later'): void;
}>();

// stores
const { t } = useI18n();
const clientStore = useClientStore();
const siteStore = useSiteStore();

// variables
const { isOnline } = useOnlineStatus();
const kind = ref<ClientKind>('individual');
const name = ref('');
const phone = ref('');
const identifier = ref('');
const email = ref('');
const location = ref<ILocation>({ ...EMPTY_LOCATION });
const created = ref<IClient | null>(null);
const clientId = ref(createId());

// computed
const normalizedIdentifier = computed((): string | null => normalizeClientIdentifier(kind.value, identifier.value));
const duplicate = computed((): IClient | undefined => (normalizedIdentifier.value ? clientStore.clientByIdentifier(normalizedIdentifier.value) : undefined));
const canReceive = computed((): boolean => siteStore.can('reception.create'));
const isIdentifierInvalid = computed((): boolean => !!identifier.value.trim() && !normalizedIdentifier.value);
const normalizedEmail = computed((): string | null => (isEmail(email.value) ? normalizeIdentifier(email.value) : null));
const isEmailInvalid = computed((): boolean => !!email.value.trim() && !normalizedEmail.value);
const missing = computed((): string[] =>
  [
    { isMissing: name.value.trim().length <= 2, key: 'name' },
    { isMissing: normalizePhone(phone.value) === null, key: 'phone' },
    { isMissing: !location.value.province, key: 'province' },
    { isMissing: !location.value.city.trim(), key: 'city' },
    { isMissing: !location.value.address.trim(), key: 'address' },
  ]
    .filter((item) => item.isMissing)
    .map((item) => t(`client.quick.missingItems.${item.key}`)),
);
const canSave = computed((): boolean => !missing.value.length && !isIdentifierInvalid.value && !isEmailInvalid.value && !clientStore.isSaving);

// methods
const reset = (): void => {
  name.value = '';
  phone.value = '';
  identifier.value = '';
  email.value = '';
  location.value = { ...EMPTY_LOCATION };
  created.value = null;
  clientId.value = createId();
};

// watchers
watch(
  () => props.prefill,
  (text) => {
    if (!text || created.value) return;
    const isPhone = /\d{3,}/.test(text);
    name.value = isPhone ? '' : text;
    phone.value = isPhone ? text : '';
  },
  { immediate: true },
);

// event handlers
const handleSave = async (): Promise<void> => {
  const normalizedPhone = normalizePhone(phone.value);
  if (!normalizedPhone || !canSave.value) return;
  const client = await clientStore.createClient({
    id: clientId.value,
    kind: kind.value,
    name: name.value.trim(),
    phone: normalizedPhone,
    siteId: siteStore.currentSite?.id ?? '',
    identifier: normalizedIdentifier.value,
    email: normalizedEmail.value,
    location: trimmedLocation(location.value),
  });
  if (!client) return;
  created.value = client;
  if (props.returnsOnCreate) handleReceive();
};

const handleReceive = (): void => {
  if (created.value) emit('receive', created.value.id);
  reset();
};

const handleUseDuplicate = (id: string): void => {
  emit('receive', id);
  reset();
};

const handleLater = (): void => {
  reset();
  emit('later');
};
</script>
