<template>
  <article class="card flex flex-col gap-4 rounded-2xl">
    <header class="flex flex-wrap items-center gap-3">
      <map-pin-line-icon class="h-5 w-5 text-accent-rust" />
      <h4 class="font-semibold text-neutral-900">{{ siteName }}</h4>
      <span class="body-two tabular-nums">{{ $t('user.detail.rightsCount', { count: granted.length, total: PERMISSIONS.length }) }}</span>
      <span v-if="!canManageSite(user, siteId) && canEdit(user)" class="chip bg-neutral-100 text-neutral-600">{{ $t('user.detail.readOnlySite') }}</span>
      <button
        v-else-if="canManageSite(user, siteId) && isRemovable"
        type="button"
        class="link ml-auto"
        :class="isRemoveArmed ? 'font-semibold text-danger-red' : 'text-danger-red/80'"
        :disabled="userStore.isSaving"
        @click="handleRemove"
      >
        {{ isRemoveArmed ? $t('user.detail.confirmRemoveSite') : $t('user.detail.removeSite') }}
      </button>
    </header>

    <div class="grid gap-4 md:grid-cols-2">
      <section v-for="group in PERMISSION_GROUPS" :key="group.key" class="flex flex-col gap-1">
        <p class="eyebrow">{{ $t(`user.groups.${group.key}`) }}</p>
        <button
          v-for="permission in group.permissions"
          :key="permission"
          type="button"
          role="switch"
          :aria-checked="granted.includes(permission)"
          class="flex min-h-11 items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors hover:bg-neutral-50
            disabled:cursor-not-allowed disabled:hover:bg-transparent"
          :disabled="!canGrant(user, siteId, permission) || pendingPermission !== null"
          :title="canEdit(user) && !canGrant(user, siteId, permission) ? $t('user.detail.locked') : undefined"
          @click="handleToggle(permission)"
        >
          <span
            class="relative h-6 w-10 shrink-0 rounded-full transition-colors duration-300"
            :class="[granted.includes(permission) ? 'bg-primary-olive-dark' : 'bg-neutral-300', { 'animate-pulse': pendingPermission === permission }]"
          >
            <span
              class="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ease-(--ease-premium)"
              :class="{ 'translate-x-4': granted.includes(permission) }"
            />
          </span>
          <span class="flex-1" :class="granted.includes(permission) ? 'text-neutral-900' : 'text-neutral-500'">
            {{ $t(`user.permissions.${permission}`) }}
          </span>
          <span v-if="isDefault(user, permission)" class="text-xs text-neutral-400">{{ $t('user.detail.default') }}</span>
          <lock-line-icon v-if="canEdit(user) && !canGrant(user, siteId, permission)" class="h-4 w-4 shrink-0 text-neutral-400" />
        </button>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useUserStore } from 'user/stores/user';
import { useToastStore } from 'global/stores/toast';
import { useUserRights } from 'user/composables/use-user-rights';
import { PERMISSIONS } from 'auth/constants/permissions';
import { PERMISSION_GROUPS } from 'user/constants/user';
import type { Permission } from 'auth/types/auth';
import type { IStaffUser } from 'user/types/user';

import LockLineIcon from 'global/icons/lock-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// props
const props = defineProps<{ user: IStaffUser; siteId: string; siteName: string }>();

// stores
const userStore = useUserStore();
const toastStore = useToastStore();
const { t } = useI18n();
const { canEdit, canManageSite, canGrant, isDefault } = useUserRights();

// variables
const pendingPermission = ref<Permission | null>(null);
const isRemoveArmed = ref(false);

// computed
const granted = computed((): Permission[] => props.user.sites[props.siteId] ?? []);
const isRemovable = computed((): boolean => Object.keys(props.user.sites).length > 1);

// watchers
watch(
  () => props.user.id,
  () => {
    isRemoveArmed.value = false;
  },
);

// event handlers
const handleToggle = async (permission: Permission): Promise<void> => {
  const permissions = granted.value.includes(permission) ? granted.value.filter((item) => item !== permission) : [...granted.value, permission];
  pendingPermission.value = permission;
  const isSaved = await userStore.setSitePermissions(props.user.id, props.siteId, permissions);
  pendingPermission.value = null;
  if (!isSaved) toastStore.push(t('user.detail.error'), 'danger');
};

const handleRemove = async (): Promise<void> => {
  if (!isRemoveArmed.value) {
    isRemoveArmed.value = true;
    return;
  }
  const isSaved = await userStore.setSitePermissions(props.user.id, props.siteId, null);
  isRemoveArmed.value = false;
  toastStore.push(isSaved ? t('user.detail.siteRemoved') : t('user.detail.error'), isSaved ? 'success' : 'danger');
};
</script>
