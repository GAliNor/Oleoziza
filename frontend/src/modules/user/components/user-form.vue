<template>
  <form :ref="setFormRoot" class="card flex max-w-2xl flex-col gap-5" novalidate @submit.prevent="handleSubmit">
    <h2 class="heading-four">{{ $t('user.form.title') }}</h2>

    <div class="flex flex-col gap-1.5">
      <span class="label">{{ $t('user.form.role') }}</span>
      <div class="grid grid-cols-3 gap-2">
        <button v-for="role in STAFF_ROLES" :key="role" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': form.role === role }" :aria-pressed="form.role === role" @click="handleRole(role)">
          {{ $t(`user.roles.${role}`) }}
        </button>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-[9rem_1fr_1fr]">
      <ui-field v-slot="{ id }" :label="$t('user.form.civility')" is-optional>
        <ui-select :id="id" v-model="form.title" :options="titleOptionsComputed" :label="$t('user.form.civility')" />
      </ui-field>
      <ui-field v-slot="{ id, describedBy, isInvalid }" name="firstName" :label="$t('user.form.firstName')" :error="errorOf('firstName')" :is-valid="isValid('firstName')" @leave="touch('firstName')">
        <input :id="id" v-model="form.firstName" class="input" type="text" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
      </ui-field>
      <ui-field v-slot="{ id, describedBy, isInvalid }" name="lastName" :label="$t('user.form.lastName')" :error="errorOf('lastName')" :is-valid="isValid('lastName')" @leave="touch('lastName')">
        <input :id="id" v-model="form.lastName" class="input" type="text" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
      </ui-field>
    </div>

    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 flex flex-wrap items-baseline gap-2">
        <span class="label">{{ $t('user.form.contactGroup') }}</span>
        <span class="caption">{{ $t(isPhoneRequiredComputed ? 'user.form.phoneNeeded' : 'global.form.oneOf') }}</span>
      </legend>
      <div class="grid gap-3 sm:grid-cols-2">
        <ui-field v-slot="{ id, describedBy, isInvalid }" name="phone" :label="$t('user.form.phone')" :is-optional="!isPhoneRequiredComputed && !!form.email.trim()" :error="errorOf('phone')" :is-valid="isValid('phone')" @leave="handleLeavePhone">
          <ui-phone-input :id="id" v-model="form.phone" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
        </ui-field>
        <ui-field v-slot="{ id, describedBy, isInvalid }" name="email" :label="$t('user.form.email')" :is-optional="isPhoneRequiredComputed || !!form.phone.trim()" :error="errorOf('email')" :is-valid="isValid('email')" @leave="handleLeaveEmail">
          <input :id="id" v-model="form.email" class="input" type="email" inputmode="email" autocomplete="off" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
        </ui-field>
      </div>
    </fieldset>

    <div class="flex flex-col gap-1.5" data-field="sites">
      <span class="label">{{ $t('user.form.sites') }}</span>
      <div class="flex flex-wrap gap-2">
        <button v-for="siteId in manageableSiteIds" :key="siteId" type="button" class="choice-chip" :class="{ 'choice-chip-active': form.siteIds.includes(siteId) }" :aria-pressed="form.siteIds.includes(siteId)" @click="handleToggleSite(siteId)">
          {{ siteName(siteId) }}
        </button>
      </div>
      <p v-if="errorOf('sites')" class="form-error" role="alert">{{ errorOf('sites') }}</p>
      <p v-else class="body-two">{{ $t('user.form.sitesHint') }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="label">{{ $t('user.form.access') }}</span>
      <div class="grid gap-2 sm:grid-cols-2">
        <button type="button" class="toggle-tile py-2 text-start" :class="{ 'toggle-tile-active': form.isInvited }" :aria-pressed="form.isInvited" @click="form.isInvited = true">
          <span class="block">{{ $t('user.form.invite') }}</span>
          <span class="block text-xs font-normal opacity-80">{{ $t('user.form.inviteHint') }}</span>
        </button>
        <button type="button" class="toggle-tile py-2 text-start" :class="{ 'toggle-tile-active': !form.isInvited }" :aria-pressed="!form.isInvited" @click="form.isInvited = false">
          <span class="block">{{ $t('user.form.firstCode') }}</span>
          <span class="block text-xs font-normal opacity-80">{{ $t('user.form.firstCodeHint') }}</span>
        </button>
      </div>
    </div>

    <ui-field v-if="!form.isInvited" v-slot="{ id, describedBy, isInvalid }" name="secret" :label="$t(isPinComputed ? 'user.form.firstPin' : 'user.form.firstPassword')" :error="errorOf('secret')" :is-valid="isValid('secret')" :hint="$t(isPinComputed ? 'user.form.pinInvalid' : 'user.form.passwordInvalid')" @leave="touch('secret')">
      <input :id="id" v-model="form.secret" class="input" :type="isPinComputed ? 'tel' : 'text'" :inputmode="isPinComputed ? 'numeric' : 'text'" autocomplete="off" :maxlength="isPinComputed ? PIN_LENGTH : undefined" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
    </ui-field>

    <p v-if="refusal" class="form-error" role="alert">{{ refusal }}</p>

    <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="userStore.isSaving" :is-wide="false" :submit-label="$t(form.isInvited ? 'user.form.submitInvite' : 'user.form.submitCreate')" @jump="jumpTo" @submit="handleSubmit">
      <template #actions>
        <button type="button" class="btn-secondary min-h-13" @click="emit('cancel')">{{ $t('user.form.cancel') }}</button>
      </template>
    </ui-form-bar>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useUserStore } from 'user/stores/user';
import { useContactCheck } from 'user/composables/use-contact-check';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { useUserRights } from 'user/composables/use-user-rights';
import { useTitleOptions } from 'user/composables/use-title-options';
import { formatPhone, normalizePhone } from 'global/composables/phone';
import { isEmail, normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { formatFullName } from 'user/composables/format';
import { userErrorMessage } from 'user/composables/user-error';
import { STAFF_ROLES } from 'user/constants/user';
import { PIN_LENGTH } from 'auth/constants/auth';
import type { IFormRule } from 'global/types/form';
import type { IStaffUser, StaffRole } from 'user/types/user';

import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import UiPhoneInput from 'global/components/ui-phone-input.vue';
import UiSelect from 'global/components/ui-select.vue';

// emits
const emit = defineEmits<{
  (event: 'saved', user: IStaffUser): void;
  (event: 'cancel'): void;
}>();

// stores
const siteStore = useSiteStore();
const toastStore = useToastStore();
const userStore = useUserStore();
const { t } = useI18n();
const { manageableSiteIds, defaultsFor } = useUserRights();
const { titleOptionsComputed, toTitle } = useTitleOptions();
const { phoneTaken, emailTaken, checkPhone, checkEmail } = useContactCheck();

// variables
const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`);
const MIN_PASSWORD_LENGTH = 8;
const initialSiteId = manageableSiteIds.value.includes(siteStore.currentSiteId ?? '') ? siteStore.currentSiteId : manageableSiteIds.value[0];
const form = reactive({
  role: 'operator' as StaffRole,
  title: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  siteIds: initialSiteId ? [initialSiteId] : ([] as string[]),
  isInvited: false,
  secret: '',
});
const refusal = ref('');

// computed
/** An Operator logs in with a phone and a PIN. */
const isPhoneRequiredComputed = computed((): boolean => form.role === 'operator');
const isPinComputed = computed((): boolean => isPhoneRequiredComputed.value || !form.email.trim());
const phoneErrorComputed = computed((): string | null => {
  if (form.phone.trim()) return normalizePhone(form.phone) ? phoneTaken.value : t('global.form.phoneInvalid');
  if (isPhoneRequiredComputed.value) return t('user.form.phoneNeeded');
  return form.email.trim() ? null : t('user.form.contactRequired');
});
const emailErrorComputed = computed((): string | null => {
  if (!form.email.trim()) return null;
  return isEmail(form.email) ? emailTaken.value : t('global.form.emailInvalid');
});
const secretErrorComputed = computed((): string | null => {
  if (isPinComputed.value) return PIN_PATTERN.test(form.secret) ? null : t('user.form.pinInvalid');
  return form.secret.length >= MIN_PASSWORD_LENGTH ? null : t('user.form.passwordInvalid');
});
const rulesComputed = computed((): IFormRule[] => [
  { key: 'firstName', label: t('user.form.firstName'), isMissing: !form.firstName.trim(), isFilled: true },
  { key: 'lastName', label: t('user.form.lastName'), isMissing: !form.lastName.trim(), isFilled: true },
  { key: 'phone', label: t(isPhoneRequiredComputed.value || form.phone.trim() ? 'user.form.phone' : 'user.form.contactGroup'), isMissing: !form.phone.trim() && !!phoneErrorComputed.value, error: phoneErrorComputed.value, isFilled: !!form.phone.trim() },
  { key: 'email', label: t('user.form.email'), error: emailErrorComputed.value, isFilled: !!form.email.trim() },
  { key: 'sites', label: t('user.form.sites'), isMissing: !form.siteIds.length, error: form.siteIds.length ? null : t('user.form.siteRequired') },
  ...(form.isInvited ? [] : [{ key: 'secret', label: t(isPinComputed.value ? 'user.form.firstPin' : 'user.form.firstPassword'), isMissing: !form.secret, error: secretErrorComputed.value, isFilled: true }]),
]);
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt } = useFormFeedback(() => rulesComputed.value);

// watchers
watch(
  () => form.phone,
  () => (phoneTaken.value = null),
);
watch(
  () => form.email,
  () => (emailTaken.value = null),
);

// methods
const siteName = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.name ?? '—';

const save = async (): Promise<void> => {
  const phone = form.phone.trim() ? normalizePhone(form.phone) : null;
  const email = form.email.trim() ? normalizeIdentifier(form.email) : null;
  refusal.value = '';
  const user = await userStore.create({
    role: form.role,
    title: toTitle(form.title),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone,
    email,
    sites: Object.fromEntries(form.siteIds.map((siteId) => [siteId, defaultsFor(form.role, siteId)])),
    isInvited: form.isInvited,
    firstSecret: form.isInvited ? null : form.secret,
  });
  if (!user) {
    refusal.value = userErrorMessage(userStore.saveErrorCode);
    return;
  }
  toastStore.push(form.isInvited ? t('user.form.invited', { to: email ?? formatPhone(phone ?? '') }) : t('user.form.created', { name: formatFullName(user) }), 'success');
  emit('saved', user);
};

// event handlers
const handleRole = (role: StaffRole): void => {
  form.role = role;
  form.secret = '';
};

const handleToggleSite = (siteId: string): void => {
  form.siteIds = form.siteIds.includes(siteId) ? form.siteIds.filter((id) => id !== siteId) : [...form.siteIds, siteId];
};

const handleLeavePhone = (): void => {
  touch('phone');
  checkPhone(form.phone);
};

const handleLeaveEmail = (): void => {
  touch('email');
  checkEmail(form.email);
};

const handleSubmit = (): void => attempt(save);
</script>
