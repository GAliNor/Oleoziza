import { computed } from 'vue';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { OPERATOR_WORKSPACE_PERMISSIONS, PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from 'auth/constants/permissions';
import type { Permission } from 'global/types/session';
import type { IStaffUser, StaffRole } from 'user/types/user';

export const useUserRights = () => {
  // stores
  const sessionStore = useSessionStore();
  const siteStore = useSiteStore();

  // computed
  const manageableSiteIds = computed((): string[] =>
    siteStore.accessibleSites.map((site) => site.id).filter((siteId) => siteStore.hasPermission('user.manage', siteId)),
  );

  // methods
  const holds = (siteId: string, permission: Permission): boolean => sessionStore.session?.isOwner === true || siteStore.hasPermission(permission, siteId);

  const canEdit = (user: IStaffUser): boolean => !user.isOwner && user.id !== sessionStore.session?.userId;

  const canManageSite = (user: IStaffUser, siteId: string): boolean => canEdit(user) && manageableSiteIds.value.includes(siteId);

  const canGrant = (user: IStaffUser, siteId: string, permission: Permission): boolean => canManageSite(user, siteId) && holds(siteId, permission);

  const isDefault = (user: IStaffUser, permission: Permission): boolean =>
    ROLE_DEFAULT_PERMISSIONS[user.role].length < PERMISSIONS.length && ROLE_DEFAULT_PERMISSIONS[user.role].includes(permission);

  /** An Operator never enters the Backoffice, so only the Operator Workspace's rights are offered; others already stored stay but open nothing. */
  const offeredFor = (role: StaffRole): readonly Permission[] => (role === 'operator' ? OPERATOR_WORKSPACE_PERMISSIONS : PERMISSIONS);

  const defaultsFor = (role: StaffRole, siteId: string): Permission[] => ROLE_DEFAULT_PERMISSIONS[role].filter((permission) => holds(siteId, permission));

  return { manageableSiteIds, holds, canEdit, canManageSite, canGrant, isDefault, offeredFor, defaultsFor };
};
