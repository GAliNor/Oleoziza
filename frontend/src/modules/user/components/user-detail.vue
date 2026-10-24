<template>
  <div class="stagger flex max-w-3xl flex-col gap-4">
    <header class="flex items-center gap-3">
      <user-avatar :user="user" class="h-12 w-12" />
      <div class="min-w-0 flex-1">
        <h2 class="heading-two truncate">{{ user.title ? `${user.title} ` : '' }}{{ formatFullName(user) }}</h2>
        <p class="flex flex-wrap items-center gap-2 body-two">
          <span>{{ $t(`user.roles.${user.role}`) }}</span>
          <span v-if="user.isOwner" class="chip bg-accent-gold/30 text-accent-brown">{{ $t('user.owner') }}</span>
          <user-status-chip :status="user.status" />
          <span v-if="user.lastLoginAt">· {{ $t('user.detail.lastLogin', { at: formatDateTime(user.lastLoginAt) }) }}</span>
          <span v-else-if="user.invitedAt">· {{ $t('user.detail.invitedAt', { at: formatDateTime(user.invitedAt) }) }}</span>
          <span v-else>· {{ $t('user.detail.neverLoggedIn') }}</span>
        </p>
      </div>
    </header>

    <p v-if="user.isOwner" class="card border-accent-gold/60 bg-accent-gold/10 body-two">{{ $t('user.detail.ownerNote') }}</p>
    <p v-else-if="isMe" class="card bg-neutral-50 body-two">{{ $t('user.detail.selfNote') }}</p>

    <div class="card grid gap-4 rounded-2xl md:grid-cols-2">
      <div class="flex flex-col gap-3">
        <p class="eyebrow">{{ $t('user.detail.contact') }}</p>
        <dl class="flex flex-col gap-2">
          <div>
            <dt class="label">{{ $t('user.detail.phone') }}</dt>
            <dd class="text-neutral-900 tabular-nums">{{ user.phone ? formatPhone(user.phone) : '—' }}</dd>
          </div>
          <div>
            <dt class="label">{{ $t('user.detail.email') }}</dt>
            <dd class="truncate text-neutral-900">{{ user.email ?? '—' }}</dd>
          </div>
        </dl>
      </div>
      <div class="flex flex-col gap-3">
        <p class="eyebrow">{{ $t('user.detail.loginMethods') }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="method in LOGIN_METHODS"
            :key="method"
            type="button"
            class="choice-chip"
            :class="{ 'choice-chip-active': user.loginMethods.includes(method) }"
            :disabled="!canEdit(user) || isUnreachable(method) || userStore.isSaving"
            :title="isUnreachable(method) ? $t('user.detail.unreachable') : undefined"
            @click="handleLoginMethod(method)"
          >
            {{ $t(`user.loginMethods.${method}`) }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="canEdit(user)" class="card flex flex-col gap-3 rounded-2xl md:flex-row md:flex-wrap md:items-center">
      <button v-if="user.status === 'invited'" type="button" class="btn-secondary" :disabled="userStore.isSaving" @click="handleInvite">
        <refresh-line-icon class="h-5 w-5" />
        {{ $t('user.actions.resendInvitation') }}
      </button>
      <button v-else-if="user.status === 'active'" type="button" class="btn-secondary" :disabled="userStore.isSaving" @click="handleReset">
        <refresh-line-icon class="h-5 w-5" />
        {{ $t('user.actions.reset') }}
      </button>
      <p v-if="isDisableArmed" class="body-two md:flex-1 md:text-right">{{ $t('user.actions.disableHint') }}</p>
      <span v-else class="hidden flex-1 md:block" aria-hidden="true" />
      <button
        v-if="user.status !== 'disabled'"
        type="button"
        class="btn-secondary border-danger-red/40 text-danger-red hover:border-danger-red hover:bg-danger-red/5"
        :class="{ 'bg-danger-red text-white hover:bg-danger-red/90': isDisableArmed }"
        :disabled="userStore.isSaving"
        @click="handleDisable"
      >
        {{ isDisableArmed ? $t('user.actions.confirmDisable') : $t('user.actions.disable') }}
      </button>
      <button v-else type="button" class="btn-secondary" :disabled="userStore.isSaving" @click="handleEnable">{{ $t('user.actions.enable') }}</button>
    </div>

    <div>
      <h3 class="heading-two">{{ $t('user.detail.rights') }}</h3>
      <p class="body-two">{{ $t('user.detail.rightsHint') }}</p>
    </div>

    <user-site-rights v-for="siteId in assignedSiteIds" :key="siteId" :user="user" :site-id="siteId" :site-name="siteName(siteId)" />

    <div v-if="canEdit(user) && unassignedSiteIds.length" class="card flex flex-wrap items-center gap-2 rounded-2xl border-dashed">
      <span class="body-two">{{ $t('user.detail.addSite') }}</span>
      <button v-for="siteId in unassignedSiteIds" :key="siteId" type="button" class="choice-chip inline-flex items-center gap-1" :disabled="userStore.isSaving" @click="handleAddSite(siteId)">
        <add-line-icon class="h-4 w-4" />
        {{ siteName(siteId) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useUserStore } from 'user/stores/user';
import { useUserRights } from 'user/composables/use-user-rights';
import { formatPhone } from 'global/composables/phone';
import { formatDateTime, formatFullName } from 'user/composables/format';
import { LOGIN_METHODS } from 'user/constants/user';
import type { LoginMethod } from 'auth/types/auth';
import type { IStaffUser } from 'user/types/user';

import UserAvatar from 'user/components/user-avatar.vue';
import UserSiteRights from 'user/components/user-site-rights.vue';
import UserStatusChip from 'user/components/user-status-chip.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import RefreshLineIcon from 'global/icons/refresh-line.icon.vue';

// props
const props = defineProps<{ user: IStaffUser }>();

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const userStore = useUserStore();
const { t } = useI18n();
const { manageableSiteIds, canEdit, defaultsFor } = useUserRights();

// variables
const isDisableArmed = ref(false);

// computed
const isMe = computed((): boolean => props.user.id === authStore.session?.userId);
const assignedSiteIds = computed((): string[] => Object.keys(props.user.sites).sort((first, second) => siteName(first).localeCompare(siteName(second), 'fr')));
const unassignedSiteIds = computed((): string[] => manageableSiteIds.value.filter((siteId) => !(siteId in props.user.sites)));
const contact = computed((): string => props.user.email ?? formatPhone(props.user.phone ?? ''));

// watchers
watch(
  () => props.user.id,
  () => {
    isDisableArmed.value = false;
  },
);

// methods
const siteName = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.name ?? '—';

const isUnreachable = (method: LoginMethod): boolean => (method === 'email_password' ? !props.user.email : !props.user.phone);

const notify = (isSaved: boolean, message: string): void => {
  toastStore.push(isSaved ? message : t('user.detail.error'), isSaved ? 'success' : 'danger');
};

// event handlers
const handleLoginMethod = async (method: LoginMethod): Promise<void> => {
  const methods = props.user.loginMethods;
  if (methods.includes(method) && methods.length === 1) {
    toastStore.push(t('user.detail.lastLoginMethod'), 'danger');
    return;
  }
  const isSaved = await userStore.setLoginMethods(props.user.id, methods.includes(method) ? methods.filter((item) => item !== method) : [...methods, method]);
  if (!isSaved) toastStore.push(t('user.detail.error'), 'danger');
};

const handleInvite = async (): Promise<void> => {
  notify(await userStore.sendInvitation(props.user.id), t('user.actions.invitationSent', { to: contact.value }));
};

const handleReset = async (): Promise<void> => {
  notify(await userStore.resetCredential(props.user.id), t('user.actions.resetSent', { to: contact.value }));
};

const handleDisable = async (): Promise<void> => {
  if (!isDisableArmed.value) {
    isDisableArmed.value = true;
    return;
  }
  isDisableArmed.value = false;
  notify(await userStore.setStatus(props.user.id, 'disabled'), t('user.actions.disabled', { name: formatFullName(props.user) }));
};

const handleEnable = async (): Promise<void> => {
  notify(await userStore.setStatus(props.user.id, 'active'), t('user.actions.enabled', { name: formatFullName(props.user) }));
};

const handleAddSite = async (siteId: string): Promise<void> => {
  notify(await userStore.setSitePermissions(props.user.id, siteId, defaultsFor(props.user.role, siteId)), t('user.detail.siteAdded'));
};
</script>
