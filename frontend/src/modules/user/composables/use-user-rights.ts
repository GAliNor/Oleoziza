import { computed } from 'vue';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from 'auth/constants/permissions';
import type { Permission } from 'auth/types/auth';
import type { IStaffUser, StaffRole } from 'user/types/user';

export const useUserRights = () => {
  // stores
  const authStore = useAuthStore();
  const siteStore = useSiteStore();

  // computed
  const manageableSiteIds = computed((): string[] =>
    siteStore.accessibleSites.map((site) => site.id).filter((siteId) => authStore.hasPermission('user.manage', siteId)),
  );

  // methods
  const holds = (siteId: string, permission: Permission): boolean => authStore.session?.isOwner === true || authStore.hasPermission(permission, siteId);

  const canEdit = (user: IStaffUser): boolean => !user.isOwner && user.id !== authStore.session?.userId;

  const canManageSite = (user: IStaffUser, siteId: string): boolean => canEdit(user) && manageableSiteIds.value.includes(siteId);

  const canGrant = (user: IStaffUser, siteId: string, permission: Permission): boolean => canManageSite(user, siteId) && holds(siteId, permission);

  const isDefault = (user: IStaffUser, permission: Permission): boolean =>
    ROLE_DEFAULT_PERMISSIONS[user.role].length < PERMISSIONS.length && ROLE_DEFAULT_PERMISSIONS[user.role].includes(permission);

  const defaultsFor = (role: StaffRole, siteId: string): Permission[] => ROLE_DEFAULT_PERMISSIONS[role].filter((permission) => holds(siteId, permission));

  return { manageableSiteIds, holds, canEdit, canManageSite, canGrant, isDefault, defaultsFor };
};
