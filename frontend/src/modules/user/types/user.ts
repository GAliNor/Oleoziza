import type { CredentialKind, LoginMethod } from 'auth/types/auth';
import type { Permission, Role, UserTitle } from 'global/types/session';

export type StaffRole = Exclude<Role, 'client'>;

export type StaffStatus = 'invited' | 'active' | 'disabled';

export type UserFilter = 'all' | 'management' | 'operator' | 'accountant' | 'invited' | 'disabled';

export type UserView = 'list' | 'teams';

export interface IStaffUser {
  id: string;
  role: StaffRole;
  isOwner: boolean;
  title?: UserTitle | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  loginMethods: LoginMethod[];
  status: StaffStatus;
  sites: Record<string, Permission[]>;
  lastLoginAt: string | null;
  invitedAt: string | null;
}

export interface IStaffForm {
  role: StaffRole;
  title: UserTitle | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  sites: Record<string, Permission[]>;
  isInvited: boolean;
  firstSecret: string | null;
}

export type IStaffProfile = Pick<IStaffForm, 'title' | 'firstName' | 'lastName' | 'phone' | 'email'>;

export interface IStaffSecret {
  kind: CredentialKind;
  secret: string;
}

export interface IContactCheck {
  phone?: string;
  email?: string;
  exceptUserId?: string;
}

/** Who already logs in with a contact: their name, empty when it may not be shown, null when the contact is free. */
export interface IContactHolders {
  phoneTakenBy: string | null;
  emailTakenBy: string | null;
}

export interface IPermissionGroup {
  key: string;
  permissions: Permission[];
}

export interface IUserService {
  getAll(): Promise<IStaffUser[]>;
  create(form: IStaffForm): Promise<IStaffUser>;
  updateSitePermissions(id: string, siteId: string, permissions: Permission[] | null): Promise<IStaffUser>;
  updateLoginMethods(id: string, loginMethods: LoginMethod[]): Promise<IStaffUser>;
  updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser>;
  updateProfile(id: string, profile: IStaffProfile): Promise<IStaffUser>;
  updateRole(id: string, role: StaffRole): Promise<IStaffUser>;
  updateSecret(id: string, secret: IStaffSecret): Promise<IStaffUser>;
  updateOwnership(id: string, isOwner: boolean): Promise<IStaffUser>;
  checkContacts(contact: IContactCheck): Promise<IContactHolders>;
  sendInvitation(id: string): Promise<IStaffUser>;
  resetCredential(id: string): Promise<void>;
}

export interface IUserStore {
  users: IStaffUser[];
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
  /** Why the last change was refused, for the screen to say. */
  saveErrorCode: string | null;
}
