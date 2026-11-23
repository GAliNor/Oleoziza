<template>
  <ui-section :title="$t('user.detail.accessTitle')" :icon="LockLineIcon" tone="blue">
    <ui-property-list>
      <ui-property :label="$t('user.detail.loginMethods')" :icon="LockLineIcon">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="method in LOGIN_METHODS"
            :key="method"
            type="button"
            class="choice-chip"
            :class="{ 'choice-chip-active': user.loginMethods.includes(method) }"
            :aria-pressed="user.loginMethods.includes(method)"
            :disabled="!canEdit(user) || isUnreachable(method) || userStore.isSaving"
            :title="isUnreachable(method) ? $t('user.detail.unreachable') : undefined"
            @click="handleLoginMethod(method)"
          >
            {{ $t(`user.loginMethods.${method}`) }}
          </button>
        </div>
      </ui-property>
      <ui-property v-if="canOwn(user)" :label="$t('user.detail.secret')" :icon="PencilLineIcon" :hint="$t('user.detail.secretHint')" :problem="secretProblemComputed" :action-label="$t('user.detail.setSecret')" is-explicit :save="saveSecret" @start="handleStartSecret">
        <span class="text-fg-muted">••••••</span>
        <template #editor>
          <div class="flex flex-wrap items-center gap-2">
            <ui-segmented v-if="kindOptionsComputed.length > 1" v-model="kind" :options="kindOptionsComputed" :label="$t('user.detail.secret')" />
            <input v-model="secret" class="input min-h-11 max-w-56" :type="kind === 'pin' ? 'tel' : 'text'" :inputmode="kind === 'pin' ? 'numeric' : 'text'" autocomplete="off" :maxlength="kind === 'pin' ? PIN_LENGTH : undefined" :aria-label="$t('user.detail.secret')" />
          </div>
        </template>
      </ui-property>
      <ui-property v-if="canEdit(user)" :label="$t('user.table.status')" :icon="ClockLineIcon">
        <user-status-chip :status="user.status" />
        <template #below>
          <div class="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <button v-if="user.status === 'invited'" type="button" class="btn-secondary min-h-10 px-4" :disabled="userStore.isSaving" @click="handleInvite">{{ $t('user.actions.resendInvitation') }}</button>
            <button v-else-if="user.status === 'active'" type="button" class="btn-secondary min-h-10 px-4" :disabled="userStore.isSaving" @click="handleReset">{{ $t('user.actions.reset') }}</button>
            <ui-confirm-button v-if="user.status !== 'disabled'" v-model:is-armed="isDisableArmed" class="min-h-10 px-4" :label="$t('user.actions.disable')" :confirm-label="$t('user.actions.confirmDisable')" :is-disabled="userStore.isSaving" @confirm="handleDisable" />
            <button v-else type="button" class="btn-secondary min-h-10 px-4" :disabled="userStore.isSaving" @click="handleEnable">{{ $t('user.actions.enable') }}</button>
          </div>
          <p v-if="isDisableArmed" class="body-three">{{ $t('user.actions.disableHint') }}</p>
        </template>
      </ui-property>
    </ui-property-list>
  </ui-section>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useToastStore } from 'global/stores/toast';
import { useUserStore } from 'user/stores/user';
import { useUserRights } from 'user/composables/use-user-rights';
import { formatPhone } from 'global/composables/phone';
import { formatFullName } from 'user/composables/format';
import { userErrorMessage } from 'user/composables/user-error';
import { LOGIN_METHODS } from 'user/constants/user';
import { PIN_LENGTH } from 'auth/constants/auth';
import type { CredentialKind, LoginMethod } from 'auth/types/auth';
import type { IStaffUser } from 'user/types/user';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiProperty from 'global/components/ui-property.vue';
import UiPropertyList from 'global/components/ui-property-list.vue';
import UiSection from 'global/components/ui-section.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UserStatusChip from 'user/components/user-status-chip.vue';
import ClockLineIcon from 'global/icons/clock-line.icon.vue';
import LockLineIcon from 'global/icons/lock-line.icon.vue';
import PencilLineIcon from 'global/icons/pencil-line.icon.vue';

// props
const props = defineProps<{ user: IStaffUser }>();

// stores
const { t } = useI18n();
const toastStore = useToastStore();
const userStore = useUserStore();
const { canEdit, canOwn } = useUserRights();

// variables
const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`);
const MIN_PASSWORD_LENGTH = 8;
const isDisableArmed = ref(false);
const kind = ref<CredentialKind>('pin');
const secret = ref('');

// computed
const kindOptionsComputed = computed((): { key: CredentialKind; label: string }[] => [
  ...(props.user.phone ? [{ key: 'pin' as const, label: t('user.detail.pin') }] : []),
  ...(props.user.email ? [{ key: 'password' as const, label: t('user.detail.password') }] : []),
]);
const secretProblemComputed = computed((): string | null => {
  if (kind.value === 'pin') return PIN_PATTERN.test(secret.value) ? null : t('user.form.pinInvalid');
  return secret.value.length >= MIN_PASSWORD_LENGTH ? null : t('user.form.passwordInvalid');
});
const contactComputed = computed((): string => props.user.email ?? formatPhone(props.user.phone ?? ''));

// methods
const isUnreachable = (method: LoginMethod): boolean => (method === 'email_password' ? !props.user.email : !props.user.phone);

const notify = (isSaved: boolean, message: string): void => {
  toastStore.push(isSaved ? message : userErrorMessage(userStore.saveErrorCode), isSaved ? 'success' : 'danger');
};

const saveSecret = async (): Promise<true | string> => {
  if (!(await userStore.setSecret(props.user.id, { kind: kind.value, secret: secret.value }))) return userErrorMessage(userStore.saveErrorCode);
  toastStore.push(t('user.detail.secretSaved', { name: formatFullName(props.user) }), 'success');
  return true;
};

// event handlers
const handleStartSecret = (): void => {
  secret.value = '';
  kind.value = props.user.role === 'operator' && props.user.phone ? 'pin' : (kindOptionsComputed.value.at(-1)?.key ?? 'pin');
};

const handleLoginMethod = async (method: LoginMethod): Promise<void> => {
  const methods = props.user.loginMethods;
  if (methods.includes(method) && methods.length === 1) {
    toastStore.push(t('user.detail.lastLoginMethod'), 'danger');
    return;
  }
  const isSaved = await userStore.setLoginMethods(props.user.id, methods.includes(method) ? methods.filter((item) => item !== method) : [...methods, method]);
  if (!isSaved) toastStore.push(userErrorMessage(userStore.saveErrorCode), 'danger');
};

const handleInvite = async (): Promise<void> => {
  notify(await userStore.sendInvitation(props.user.id), t('user.actions.invitationSent', { to: contactComputed.value }));
};

const handleReset = async (): Promise<void> => {
  notify(await userStore.resetCredential(props.user.id), t('user.actions.resetSent', { to: contactComputed.value }));
};

const handleDisable = async (): Promise<void> => {
  notify(await userStore.setStatus(props.user.id, 'disabled'), t('user.actions.disabled', { name: formatFullName(props.user) }));
};

const handleEnable = async (): Promise<void> => {
  notify(await userStore.setStatus(props.user.id, 'active'), t('user.actions.enabled', { name: formatFullName(props.user) }));
};
</script>
