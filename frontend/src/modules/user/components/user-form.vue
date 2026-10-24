<template>
  <form class="card flex max-w-2xl flex-col gap-4 rounded-2xl" novalidate @submit.prevent="handleSubmit">
    <h2 class="heading-two">{{ $t('user.form.title') }}</h2>

    <div class="flex flex-col gap-1.5">
      <span class="label">{{ $t('user.form.role') }}</span>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="role in STAFF_ROLES" :key="role" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': form.role === role }" @click="handleRole(role)">
          {{ $t(`user.roles.${role}`) }}
        </button>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="flex flex-col gap-1.5">
        <label class="label" for="user-first-name">{{ $t('user.form.firstName') }}</label>
        <input id="user-first-name" v-model="form.firstName" class="input" type="text" autocomplete="off" required />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="label" for="user-last-name">{{ $t('user.form.lastName') }}</label>
        <input id="user-last-name" v-model="form.lastName" class="input" type="text" autocomplete="off" required />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="label" for="user-phone">{{ $t('user.form.phone') }}</label>
        <input id="user-phone" v-model="form.phone" class="input" type="tel" inputmode="tel" placeholder="06 61 00 00 00" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="label" for="user-email">{{ $t('user.form.email') }}</label>
        <input id="user-email" v-model="form.email" class="input" type="email" inputmode="email" />
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="label">{{ $t('user.form.sites') }}</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="siteId in manageableSiteIds"
          :key="siteId"
          type="button"
          class="choice-chip"
          :class="{ 'choice-chip-active': form.siteIds.includes(siteId) }"
          @click="handleToggleSite(siteId)"
        >
          {{ siteName(siteId) }}
        </button>
      </div>
      <p class="body-two">{{ $t('user.form.sitesHint') }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="label">{{ $t('user.form.access') }}</span>
      <div class="grid gap-2 sm:grid-cols-2">
        <button type="button" class="toggle-tile py-2 text-left" :class="{ 'toggle-tile-active': form.isInvited }" @click="form.isInvited = true">
          <span class="block">{{ $t('user.form.invite') }}</span>
          <span class="block text-xs font-normal opacity-80">{{ $t('user.form.inviteHint') }}</span>
        </button>
        <button type="button" class="toggle-tile py-2 text-left" :class="{ 'toggle-tile-active': !form.isInvited }" @click="form.isInvited = false">
          <span class="block">{{ $t('user.form.firstCode') }}</span>
          <span class="block text-xs font-normal opacity-80">{{ $t('user.form.firstCodeHint') }}</span>
        </button>
      </div>
    </div>

    <div v-if="!form.isInvited" class="flex flex-col gap-1.5">
      <label class="label" for="user-secret">{{ isPin ? $t('user.form.firstPin') : $t('user.form.firstPassword') }}</label>
      <input
        id="user-secret"
        v-model="form.secret"
        class="input"
        :type="isPin ? 'tel' : 'text'"
        :inputmode="isPin ? 'numeric' : 'text'"
        autocomplete="off"
        :maxlength="isPin ? 6 : undefined"
      />
    </div>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>

    <div class="flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="emit('cancel')">{{ $t('user.form.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="userStore.isSaving">
        {{ form.isInvited ? $t('user.form.submitInvite') : $t('user.form.submitCreate') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useUserStore } from 'user/stores/user';
import { useUserRights } from 'user/composables/use-user-rights';
import { formatPhone, normalizePhone } from 'global/composables/phone';
import { normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { formatFullName } from 'user/composables/format';
import { STAFF_ROLES } from 'user/constants/user';
import type { IStaffUser, StaffRole } from 'user/types/user';

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

// variables
const PIN_PATTERN = /^\d{4,6}$/;
const MIN_PASSWORD_LENGTH = 8;
const initialSiteId = manageableSiteIds.value.includes(siteStore.currentSiteId ?? '') ? siteStore.currentSiteId : manageableSiteIds.value[0];
const form = reactive({
  role: 'operator' as StaffRole,
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  siteIds: initialSiteId ? [initialSiteId] : ([] as string[]),
  isInvited: true,
  secret: '',
});
const error = ref('');

// computed
const isPin = computed((): boolean => form.role === 'operator' || !form.email.trim());

// methods
const siteName = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.name ?? '—';

const validate = (phone: string | null, email: string | null): string => {
  if (!form.firstName.trim() || !form.lastName.trim()) return t('user.form.nameRequired');
  if (form.phone.trim() && !phone) return t('user.form.contactInvalid');
  if (form.email.trim() && !email) return t('user.form.contactInvalid');
  if (!phone && !email) return t('user.form.contactRequired');
  if (!form.siteIds.length) return t('user.form.siteRequired');
  if (!form.isInvited && isPin.value && !PIN_PATTERN.test(form.secret)) return t('user.form.pinInvalid');
  if (!form.isInvited && !isPin.value && form.secret.length < MIN_PASSWORD_LENGTH) return t('user.form.passwordInvalid');
  return '';
};

// event handlers
const handleRole = (role: StaffRole): void => {
  form.role = role;
  form.secret = '';
};

const handleToggleSite = (siteId: string): void => {
  form.siteIds = form.siteIds.includes(siteId) ? form.siteIds.filter((id) => id !== siteId) : [...form.siteIds, siteId];
};

const handleSubmit = async (): Promise<void> => {
  const phone = form.phone.trim() ? normalizePhone(form.phone) : null;
  const email = form.email.trim() ? normalizeIdentifier(form.email) : null;
  error.value = validate(phone, email);
  if (error.value) return;
  const user = await userStore.create({
    role: form.role,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone,
    email,
    sites: Object.fromEntries(form.siteIds.map((siteId) => [siteId, defaultsFor(form.role, siteId)])),
    isInvited: form.isInvited,
    firstSecret: form.isInvited ? null : form.secret,
  });
  if (!user) {
    error.value = t('user.form.error');
    return;
  }
  toastStore.push(
    form.isInvited ? t('user.form.invited', { to: email ?? formatPhone(phone ?? '') }) : t('user.form.created', { name: formatFullName(user) }),
    'success',
  );
  emit('saved', user);
};
</script>
