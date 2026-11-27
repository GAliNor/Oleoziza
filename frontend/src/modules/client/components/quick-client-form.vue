<template>
  <section :ref="setFormRoot" class="flex flex-col gap-4">
    <template v-if="!created">
      <h1 class="heading-one">{{ $t('client.quick.title') }}</h1>
      <div class="flex items-center gap-3">
        <span class="grid h-16 w-16 shrink-0">
          <Transition name="avatar-swap">
            <ui-avatar :key="kind" class="h-16 w-16 [grid-area:1/1]" :name="displayNameComputed || $t('client.quick.placeholderAvatar')" :variant="clientAvatarVariant(kind)" />
          </Transition>
        </span>
        <ui-segmented v-model="kind" class="flex-1" is-full is-choice :options="kindOptionsComputed" :label="$t('client.quick.kindLabel')" />
      </div>
      <div ref="nameBlock" class="relative">
        <Transition name="name-swap">
          <ui-field v-if="kind === 'company'" key="company" v-slot="{ id, describedBy, isInvalid }" name="companyName" :label="$t('client.quick.companyName')" :error="errorOf('companyName')" :is-valid="isValid('companyName')" @leave="touch('companyName')">
            <input :id="id" v-model="name" class="input" type="text" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
          </ui-field>
          <div v-else key="individual" class="grid gap-4 sm:grid-cols-2">
            <ui-field v-slot="{ id, describedBy, isInvalid }" name="firstName" :label="$t('client.quick.firstName')" :error="errorOf('firstName')" :is-valid="isValid('firstName')" @leave="touch('firstName')">
              <input :id="id" v-model="firstName" class="input" type="text" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
            </ui-field>
            <ui-field v-slot="{ id, describedBy, isInvalid }" name="lastName" :label="$t('client.quick.lastName')" :error="errorOf('lastName')" :is-valid="isValid('lastName')" @leave="touch('lastName')">
              <input :id="id" v-model="lastName" class="input" type="text" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
            </ui-field>
          </div>
        </Transition>
      </div>
      <ui-field v-slot="{ id, describedBy, isInvalid }" name="phone" :label="$t('client.quick.phoneLabel')" :error="errorOf('phone')" :is-valid="isValid('phone')" @leave="touch('phone')">
        <ui-phone-input :id="id" v-model="phone" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
        <client-duplicate v-if="phoneDuplicateComputed && phoneDuplicateComputed.id !== identifierDuplicateComputed?.id" :client="phoneDuplicateComputed" :title="$t('client.quick.duplicate.phone', { name: phoneDuplicateComputed.name })" :can-receive="canReceive" @receive="handleUseDuplicate" />
      </ui-field>
      <ui-field v-slot="{ id, describedBy, isInvalid }" name="identifier" :label="$t(`client.quick.identifier.${kind}`)" is-optional :error="errorOf('identifier')" :is-valid="isValid('identifier')" @leave="touch('identifier')">
        <input
          :id="id"
          v-model="identifier"
          class="input tabular-nums"
          :class="kind === 'company' ? 'placeholder-swap-a' : 'placeholder-swap-b'"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          :inputmode="kind === 'company' ? 'numeric' : 'text'"
          :placeholder="$t(`client.quick.identifierPlaceholder.${kind}`)"
          :aria-invalid="isInvalid"
          :aria-describedby="describedBy"
        />
        <client-duplicate v-if="identifierDuplicateComputed" :client="identifierDuplicateComputed" :title="$t(`client.quick.duplicate.${kind}`, { name: identifierDuplicateComputed.name })" :can-receive="canReceive" @receive="handleUseDuplicate" />
      </ui-field>
      <ui-field v-slot="{ id, describedBy, isInvalid }" name="email" :label="$t('client.quick.email')" is-optional :error="errorOf('email')" :is-valid="isValid('email')" @leave="touch('email')">
        <input :id="id" v-model="email" class="input" type="email" inputmode="email" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
      </ui-field>
      <ui-disclosure v-model:is-open="isPlaceOpen" :title="$t('client.quick.addPlace')">
        <location-fields v-model="location" :is-map-shown="isActive && isPlaceOpen" />
      </ui-disclosure>
      <p v-if="!isOnline" class="body-two">{{ $t('client.quick.offlineHint') }}</p>
      <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="clientStore.isSaving" :submit-label="$t(identifierDuplicateComputed ? 'client.quick.createAnyway' : 'client.quick.create')" @jump="jumpTo" @submit="handleSave" />
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
import { normalizePhone } from 'global/composables/phone';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { useSmoothHeight } from 'global/composables/use-smooth-height';
import { isEmail, normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import { normalizeClientIdentifier } from 'client/composables/client-identifier';
import { isLocationEmpty, trimmedLocation } from 'territory/composables/location';
import { EMPTY_LOCATION } from 'territory/constants/provinces';
import type { IFormRule } from 'global/types/form';
import type { ClientKind, IClient } from 'client/types/client';
import type { ILocation } from 'territory/types/territory';

import UiAvatar from 'global/components/ui-avatar.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UiDisclosure from 'global/components/ui-disclosure.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import UiPhoneInput from 'global/components/ui-phone-input.vue';
import ClientDuplicate from 'client/components/client-duplicate.vue';
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
const firstName = ref('');
const lastName = ref('');
const phone = ref('');
const identifier = ref('');
const email = ref('');
const location = ref<ILocation>({ ...EMPTY_LOCATION });
const created = ref<IClient | null>(null);
const clientId = ref(createId());
const isPlaceOpen = ref(false);
const nameBlock = ref<HTMLElement | null>(null);
useSmoothHeight(nameBlock, kind);

// computed
const kindOptionsComputed = computed((): { key: ClientKind; label: string }[] => [
  { key: 'individual', label: t('client.quick.individual') },
  { key: 'company', label: t('client.quick.company') },
]);
const displayNameComputed = computed((): string => (kind.value === 'company' ? name.value.trim() : `${firstName.value.trim()} ${lastName.value.trim()}`.trim()));
const normalizedIdentifier = computed((): string | null => normalizeClientIdentifier(kind.value, identifier.value));
const identifierDuplicateComputed = computed((): IClient | undefined => (normalizedIdentifier.value ? clientStore.clientByIdentifier(normalizedIdentifier.value) : undefined));
/** Families may share a phone: it only warns. */
const phoneDuplicateComputed = computed((): IClient | undefined => {
  const normalized = normalizePhone(phone.value);
  return normalized ? clientStore.clients.find((client) => client.phone === normalized) : undefined;
});
const canReceive = computed((): boolean => siteStore.can('reception.create'));
const normalizedEmail = computed((): string | null => (isEmail(email.value) ? normalizeIdentifier(email.value) : null));
const rulesComputed = computed((): IFormRule[] => [
  ...(kind.value === 'company'
    ? [{ key: 'companyName', label: t('client.quick.companyName'), isMissing: name.value.trim().length <= 2, isFilled: true }]
    : [
        { key: 'firstName', label: t('client.quick.firstName'), isMissing: !firstName.value.trim(), isFilled: true },
        { key: 'lastName', label: t('client.quick.lastName'), isMissing: !lastName.value.trim(), isFilled: true },
      ]),
  { key: 'phone', label: t('client.quick.phoneLabel'), isMissing: !phone.value.trim(), error: phone.value.trim() && !normalizePhone(phone.value) ? t('global.form.phoneInvalid') : null, isFilled: true },
  { key: 'identifier', label: t(`client.quick.identifier.${kind.value}`), error: identifier.value.trim() && !normalizedIdentifier.value ? t(`client.quick.identifierInvalid.${kind.value}`) : null, isFilled: !!identifier.value.trim() },
  { key: 'email', label: t('client.quick.email'), error: email.value.trim() && !normalizedEmail.value ? t('global.form.emailInvalid') : null, isFilled: !!email.value.trim() },
]);
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt, reset: resetFeedback } = useFormFeedback(() => rulesComputed.value);

// methods
const reset = (): void => {
  name.value = '';
  firstName.value = '';
  lastName.value = '';
  phone.value = '';
  identifier.value = '';
  email.value = '';
  location.value = { ...EMPTY_LOCATION };
  created.value = null;
  clientId.value = createId();
  isPlaceOpen.value = false;
  resetFeedback();
};

// watchers
watch(
  () => props.prefill,
  (text) => {
    if (!text || created.value) return;
    const isPhone = /\d{3,}/.test(text);
    name.value = isPhone ? '' : text;
    firstName.value = isPhone ? '' : text;
    phone.value = isPhone ? text : '';
  },
  { immediate: true },
);

// event handlers
const save = async (): Promise<void> => {
  const normalizedPhone = normalizePhone(phone.value);
  if (!normalizedPhone || clientStore.isSaving) return;
  const client = await clientStore.createClient({
    id: clientId.value,
    kind: kind.value,
    firstName: kind.value === 'individual' ? firstName.value.trim() : null,
    lastName: kind.value === 'individual' ? lastName.value.trim() : null,
    legalName: kind.value === 'company' ? name.value.trim() : null,
    phone: normalizedPhone,
    siteId: siteStore.currentSite?.id ?? '',
    identifier: normalizedIdentifier.value,
    email: normalizedEmail.value,
    location: isLocationEmpty(location.value) ? null : trimmedLocation(location.value),
  });
  if (!client) return;
  created.value = client;
  if (props.returnsOnCreate) handleReceive();
};

const handleSave = (): void => attempt(save);

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

<style scoped>
/* Switching Particulier / Entreprise: the old name fields dissolve where they stand while the new ones settle in, and the form below glides to its new height. */
.name-swap-enter-active {
  transition:
    opacity 420ms var(--ease-premium),
    transform 560ms var(--ease-premium),
    filter 420ms var(--ease-premium);
}

.name-swap-leave-active {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  pointer-events: none;
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out,
    filter 200ms ease-out;
}

.name-swap-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
  filter: blur(8px);
}

.name-swap-leave-to {
  opacity: 0;
  transform: scale(0.985);
  filter: blur(6px);
}

.name-swap-enter-active > :nth-child(2) {
  animation: name-follow 560ms 70ms var(--ease-premium) backwards;
}

@keyframes name-follow {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

/* The placeholder has no element to transition: switching between two identical animations restarts the fade on each change. */
.placeholder-swap-a::placeholder {
  animation: placeholder-in-a 420ms var(--ease-premium);
}

.placeholder-swap-b::placeholder {
  animation: placeholder-in-b 420ms var(--ease-premium);
}

@keyframes placeholder-in-a {
  from {
    opacity: 0;
  }
}

@keyframes placeholder-in-b {
  from {
    opacity: 0;
  }
}

.avatar-swap-enter-active {
  transition:
    opacity 320ms var(--ease-premium),
    transform 520ms var(--ease-spring),
    filter 320ms var(--ease-premium);
}

.avatar-swap-leave-active {
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out,
    filter 200ms ease-out;
}

.avatar-swap-enter-from {
  opacity: 0;
  transform: scale(0.82);
  filter: blur(4px);
}

.avatar-swap-leave-to {
  opacity: 0;
  transform: scale(1.06);
  filter: blur(4px);
}

@media (prefers-reduced-motion: reduce) {
  .name-swap-enter-active,
  .name-swap-leave-active,
  .avatar-swap-enter-active,
  .avatar-swap-leave-active {
    transition: opacity 120ms linear;
  }

  .name-swap-enter-from,
  .name-swap-leave-to,
  .avatar-swap-enter-from,
  .avatar-swap-leave-to {
    transform: none;
    filter: none;
  }

  .name-swap-enter-active > :nth-child(2),
  .placeholder-swap-a::placeholder,
  .placeholder-swap-b::placeholder {
    animation: none;
  }
}
</style>
