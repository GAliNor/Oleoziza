<template>
  <ui-section :title="$t('user.detail.profileTitle')" :icon="IdCardLineIcon" tone="olive">
    <ui-property-list>
      <ui-property :label="$t('user.form.role')" :icon="IdCardLineIcon" :is-locked="!canOwn(user)" :hint="$t('user.detail.roleHint')" :save="saveRole" is-explicit @start="role = user.role">
        {{ $t(`user.roles.${user.role}`) }}
        <template #editor>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="option in STAFF_ROLES" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': role === option }" :aria-pressed="role === option" @click="role = option">{{ $t(`user.roles.${option}`) }}</button>
          </div>
        </template>
      </ui-property>
      <ui-property :label="$t('user.detail.civility')" :icon="UserLineIcon" :is-locked="!isEditableComputed" :is-empty="!user.title" is-optional :save="save" @start="start">
        {{ user.title ? $t(`global.titles.${user.title}`) : '' }}
        <template #editor="{ submit }">
          <ui-select :model-value="draft.title" :options="titleOptionsComputed" :label="$t('user.detail.civility')" @update:model-value="(value) => ((draft.title = value ?? ''), submit())" />
        </template>
      </ui-property>
      <ui-property v-for="field in NAME_FIELDS" :key="field" :label="$t(`user.form.${field}`)" :icon="UserLineIcon" :is-locked="!isEditableComputed" :problem="draft[field].trim() ? null : $t('global.form.required')" :save="save" @start="start">
        {{ user[field] }}
        <template #editor><input v-model="draft[field]" class="input min-h-11" type="text" autocomplete="off" /></template>
      </ui-property>
      <ui-property :label="$t('user.detail.phone')" :icon="PhoneLineIcon" :is-locked="!isEditableComputed" :is-empty="!user.phone" :is-optional="!!user.email" :problem="phoneProblemComputed" :save="save" @start="start">
        <span class="tabular-nums">{{ formatPhone(user.phone ?? '') }}</span>
        <template #editor><ui-phone-input v-model="draft.phone" class="min-h-11" /></template>
      </ui-property>
      <ui-property :label="$t('user.detail.email')" :icon="MailLineIcon" :is-locked="!isEditableComputed" :is-empty="!user.email" :is-optional="!!user.phone" :problem="emailProblemComputed" :save="save" @start="start">
        <span class="break-all">{{ user.email }}</span>
        <template #editor><input v-model="draft.email" class="input min-h-11" type="email" inputmode="email" autocomplete="off" /></template>
      </ui-property>
      <ui-property :label="$t('user.owner')" :icon="CrownLineIcon">
        {{ $t(user.isOwner ? 'user.detail.isOwner' : 'user.detail.isNotOwner') }}
        <template v-if="canSetOwnership(user)" #below>
          <div class="flex flex-wrap items-center gap-3 pb-1">
            <ui-confirm-button
              class="min-h-10 px-4"
              :is-danger="user.isOwner"
              :label="$t(user.isOwner ? 'user.detail.withdrawOwner' : 'user.detail.makeOwner')"
              :confirm-label="$t(user.isOwner ? 'user.detail.withdrawOwnerConfirm' : 'user.detail.makeOwnerConfirm')"
              :is-disabled="userStore.isSaving"
              @confirm="handleOwnership"
            />
            <p class="body-three max-w-prose">{{ $t(user.isOwner ? 'user.detail.withdrawOwnerHint' : 'user.detail.makeOwnerHint') }}</p>
          </div>
        </template>
      </ui-property>
    </ui-property-list>
  </ui-section>
</template>

<script setup lang="ts">
// imports
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { useUserStore } from 'user/stores/user';
import { isEmail, normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { formatPhone, normalizePhone } from 'global/composables/phone';
import { formatFullName } from 'user/composables/format';
import { takenMessage, userErrorMessage } from 'user/composables/user-error';
import { useTitleOptions } from 'user/composables/use-title-options';
import { useUserRights } from 'user/composables/use-user-rights';
import { STAFF_ROLES } from 'user/constants/user';
import type { IStaffUser, StaffRole } from 'user/types/user';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiPhoneInput from 'global/components/ui-phone-input.vue';
import UiProperty from 'global/components/ui-property.vue';
import UiPropertyList from 'global/components/ui-property-list.vue';
import UiSection from 'global/components/ui-section.vue';
import UiSelect from 'global/components/ui-select.vue';
import CrownLineIcon from 'global/icons/crown-line.icon.vue';
import IdCardLineIcon from 'global/icons/id-card-line.icon.vue';
import MailLineIcon from 'global/icons/mail-line.icon.vue';
import PhoneLineIcon from 'global/icons/phone-line.icon.vue';
import UserLineIcon from 'global/icons/user-line.icon.vue';

// props
const props = defineProps<{ user: IStaffUser }>();

// stores
const { t } = useI18n();
const router = useRouter();
const sessionStore = useSessionStore();
const toastStore = useToastStore();
const userStore = useUserStore();
const { canEditProfile, canOwn, canSetOwnership } = useUserRights();
const { titleOptionsComputed, toTitle } = useTitleOptions();

// variables
const NAME_FIELDS = ['firstName', 'lastName'] as const;
const role = ref<StaffRole>(props.user.role);
const draft = reactive({ title: '', firstName: '', lastName: '', phone: '', email: '' });

// computed
const isEditableComputed = computed((): boolean => canEditProfile(props.user));
const isContactMissingComputed = computed((): boolean => !draft.phone.trim() && !draft.email.trim());
const phoneProblemComputed = computed((): string | null => {
  if (isContactMissingComputed.value) return t('user.form.contactRequired');
  return !draft.phone.trim() || normalizePhone(draft.phone) ? null : t('global.form.phoneInvalid');
});
const emailProblemComputed = computed((): string | null => {
  if (isContactMissingComputed.value) return t('user.form.contactRequired');
  return !draft.email.trim() || isEmail(draft.email) ? null : t('global.form.emailInvalid');
});

// methods
/** Each property edits the whole profile, read afresh, so none overwrites another. */
const start = (): void => {
  const { title, firstName, lastName, phone, email } = props.user;
  Object.assign(draft, { title: title ?? '', firstName, lastName, phone: phone ? formatPhone(phone) : '', email: email ?? '' });
};

const refusalMessage = async (phone: string | null, email: string | null): Promise<string> => {
  const code = userStore.saveErrorCode;
  if (code !== 'phone_taken' && code !== 'email_taken') return userErrorMessage(code);
  const holders = await userStore.checkContacts({ phone: phone ?? undefined, email: email ?? undefined, exceptUserId: props.user.id });
  return takenMessage(code === 'phone_taken' ? holders.phoneTakenBy : holders.emailTakenBy) ?? userErrorMessage(code);
};

const save = async (): Promise<true | string> => {
  const phone = draft.phone.trim() ? normalizePhone(draft.phone) : null;
  const email = draft.email.trim() ? normalizeIdentifier(draft.email) : null;
  const profile = { title: toTitle(draft.title), firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), phone, email };
  const { title, firstName, lastName } = props.user;
  if (JSON.stringify(profile) === JSON.stringify({ title: title ?? null, firstName, lastName, phone: props.user.phone, email: props.user.email })) return true;
  return (await userStore.updateProfile(props.user.id, profile)) ? true : refusalMessage(phone, email);
};

const saveRole = async (): Promise<true | string> => {
  if (role.value === props.user.role) return true;
  return (await userStore.setRole(props.user.id, role.value)) ? true : userErrorMessage(userStore.saveErrorCode);
};

// event handlers
const handleOwnership = async (): Promise<void> => {
  const isOwner = !props.user.isOwner;
  const name = formatFullName(props.user);
  if (!(await userStore.setOwnership(props.user.id, isOwner))) {
    toastStore.push(userErrorMessage(userStore.saveErrorCode), 'danger');
    return;
  }
  toastStore.push(t(isOwner ? 'user.detail.madeOwner' : 'user.detail.withdrawnOwner', { name }), 'success');
  if (props.user.id === sessionStore.session?.userId) router.push({ name: 'auth-logout' });
};
</script>
