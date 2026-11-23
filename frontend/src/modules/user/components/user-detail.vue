<template>
  <div class="stagger @container flex w-full min-w-0 flex-col gap-5">
    <header class="flex items-center gap-4">
      <user-avatar :user="user" class="h-16 w-16" />
      <div class="min-w-0 flex-1">
        <h2 class="heading-two truncate">{{ user.title ? `${$t(`global.titles.${user.title}`)} ` : '' }}{{ formatFullName(user) }}</h2>
        <p class="flex flex-wrap items-center gap-2 body-two">
          <span v-if="user.isOwner" class="chip bg-highlight/30 text-fg-accent">{{ $t('user.owner') }}</span>
          <user-status-chip :status="user.status" />
          <span v-if="user.lastLoginAt">{{ $t('user.detail.lastLogin', { at: formatDateTime(user.lastLoginAt) }) }}</span>
          <span v-else-if="user.invitedAt">{{ $t('user.detail.invitedAt', { at: formatDateTime(user.invitedAt) }) }}</span>
          <span v-else>{{ $t('user.detail.neverLoggedIn') }}</span>
        </p>
      </div>
    </header>

    <p v-if="user.isOwner" class="rounded-card bg-highlight/10 p-4 body-two">{{ $t('user.detail.ownerNote') }}</p>
    <p v-else-if="isMeComputed" class="rounded-card bg-subtle p-4 body-two">{{ $t('user.detail.selfNote') }}</p>

    <div class="grid items-start gap-4 @4xl:grid-cols-2">
      <user-profile :user="user" />
      <user-access :user="user" />
    </div>

    <ui-section :title="$t('user.detail.rightsTitle')" :icon="LockLineIcon" tone="brown" :summary="$t('user.detail.sitesCount', { count: assignedSiteIdsComputed.length }, assignedSiteIdsComputed.length)">
      <ui-reveal :label="$t('user.detail.rights')">
        <div class="flex flex-col gap-4 pt-2">
          <p class="px-2 body-two">{{ $t('user.detail.rightsHint') }}</p>
          <user-site-rights v-for="siteId in assignedSiteIdsComputed" :key="siteId" :user="user" :site-id="siteId" :site-name="siteName(siteId)" />
        </div>
      </ui-reveal>
      <div v-if="canEdit(user) && unassignedSiteIdsComputed.length" class="flex flex-wrap items-center gap-2 px-2">
        <span class="body-two">{{ $t('user.detail.addSite') }}</span>
        <button v-for="siteId in unassignedSiteIdsComputed" :key="siteId" type="button" class="choice-chip inline-flex items-center gap-1" :disabled="userStore.isSaving" @click="handleAddSite(siteId)">
          <add-line-icon class="h-4 w-4" />
          {{ siteName(siteId) }}
        </button>
      </div>
    </ui-section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useUserStore } from 'user/stores/user';
import { useUserRights } from 'user/composables/use-user-rights';
import { formatDateTime } from 'global/composables/date';
import { formatFullName } from 'user/composables/format';
import { userErrorMessage } from 'user/composables/user-error';
import type { IStaffUser } from 'user/types/user';

import UiReveal from 'global/components/ui-reveal.vue';
import UserAccess from 'user/components/user-access.vue';
import UserAvatar from 'user/components/user-avatar.vue';
import UserProfile from 'user/components/user-profile.vue';
import UserSiteRights from 'user/components/user-site-rights.vue';
import UserStatusChip from 'user/components/user-status-chip.vue';
import UiSection from 'global/components/ui-section.vue';
import LockLineIcon from 'global/icons/lock-line.icon.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';

// props
const props = defineProps<{ user: IStaffUser }>();

// stores
const { t } = useI18n();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const userStore = useUserStore();
const { manageableSiteIds, canEdit, defaultsFor } = useUserRights();

// computed
const isMeComputed = computed((): boolean => props.user.id === sessionStore.session?.userId);
const assignedSiteIdsComputed = computed((): string[] => Object.keys(props.user.sites).sort((first, second) => siteName(first).localeCompare(siteName(second), 'fr')));
const unassignedSiteIdsComputed = computed((): string[] => manageableSiteIds.value.filter((siteId) => !(siteId in props.user.sites)));

// methods
const siteName = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.name ?? '—';

// event handlers
const handleAddSite = async (siteId: string): Promise<void> => {
  const isSaved = await userStore.setSitePermissions(props.user.id, siteId, defaultsFor(props.user.role, siteId));
  toastStore.push(isSaved ? t('user.detail.siteAdded') : userErrorMessage(userStore.saveErrorCode), isSaved ? 'success' : 'danger');
};
</script>
