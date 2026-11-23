import { readUnverifiedJwt } from '~/plugins/jose';

import { ROLE_DEFAULT_PERMISSIONS } from 'auth/constants/permissions';
import { ApiRefusal } from 'global/services/api-error';
import { mockReject, mockResolve } from 'global/services/mock';
import { getAccessToken } from 'global/services/access-token';
import { createId } from 'global/composables/crypto';
import { MOCK_INVITATIONS_DB, MOCK_USERS_DB } from 'auth/services/users.mock-db';
import type { LoginMethod } from 'auth/types/auth';
import type { Permission } from 'global/types/session';
import type { IMockUser } from 'auth/types/mock-auth';
import type { IContactCheck, IContactHolders, IStaffForm, IStaffProfile, IStaffSecret, IStaffUser, IUserService, StaffRole, StaffStatus } from 'user/types/user';

const toStaffUser = (user: IMockUser): IStaffUser => ({
  id: user.id,
  role: user.role as StaffRole,
  isOwner: user.isOwner,
  title: user.title,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  email: user.email,
  loginMethods: [...user.loginMethods],
  status: user.status,
  sites: Object.fromEntries(Object.entries(user.sites).map(([siteId, permissions]) => [siteId, [...permissions]])),
  lastLoginAt: user.lastLoginAt ?? null,
  invitedAt: user.invitedAt ?? null,
});

const findEditable = (id: string): IMockUser | Error => {
  const user = MOCK_USERS_DB.find((candidate) => candidate.id === id && candidate.role !== 'client');
  if (!user) return new Error('user_not_found');
  if (user.isOwner) return new Error('owner_locked');
  return user;
};

/** Who already logs in with a contact, whatever its case. */
const holdersOf = ({ phone, email, exceptUserId }: IContactCheck): IContactHolders => {
  const nameOf = (holder: IMockUser | undefined): string | null => (holder ? `${holder.firstName} ${holder.lastName}` : null);
  const others = MOCK_USERS_DB.filter((user) => user.id !== exceptUserId);
  return {
    phoneTakenBy: phone ? nameOf(others.find((user) => user.phone === phone)) : null,
    emailTakenBy: email ? nameOf(others.find((user) => user.email?.toLowerCase() === email.toLowerCase())) : null,
  };
};

const inviterName = (): string => {
  const token = getAccessToken();
  if (!token) return '';
  const claims = readUnverifiedJwt(token) as { firstName?: string; lastName?: string };
  return `${claims.firstName ?? ''} ${claims.lastName ?? ''}`.trim();
};

const invite = (user: IMockUser): void => {
  const token = createId();
  MOCK_INVITATIONS_DB.push({ token, userId: user.id, invitedBy: inviterName() });
  user.invitedAt = new Date().toISOString();
  console.info(`[mock] Invitation: /invitation/${token}`);
};

export default class UserMockService implements IUserService {
  getAll(): Promise<IStaffUser[]> {
    return mockResolve(MOCK_USERS_DB.filter((user) => user.role !== 'client').map(toStaffUser));
  }

  create(form: IStaffForm): Promise<IStaffUser> {
    const holders = holdersOf({ phone: form.phone ?? undefined, email: form.email ?? undefined });
    if (holders.phoneTakenBy !== null) return mockReject(new ApiRefusal('phone_taken'));
    if (holders.emailTakenBy !== null) return mockReject(new ApiRefusal('email_taken'));
    const isOperator = form.role === 'operator';
    const user: IMockUser = {
      id: createId(),
      role: form.role,
      clientId: null,
      title: form.title ?? undefined,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      loginMethods: isOperator || !form.email ? ['phone_pin'] : ['email_password'],
      pin: !form.isInvited && (isOperator || !form.email) ? form.firstSecret : null,
      password: !form.isInvited && !isOperator && form.email ? form.firstSecret : null,
      mustChangeCredential: !form.isInvited,
      status: form.isInvited ? 'invited' : 'active',
      isOwner: false,
      sites: form.sites,
      hint: '',
      lastLoginAt: null,
      invitedAt: null,
    };
    if (form.isInvited) invite(user);
    MOCK_USERS_DB.push(user);
    return mockResolve(toStaffUser(user));
  }

  updateSitePermissions(id: string, siteId: string, permissions: Permission[] | null): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    if (permissions === null) {
      if (Object.keys(user.sites).length <= 1) return mockReject(new Error('last_site'));
      const { [siteId]: _removed, ...sites } = user.sites;
      user.sites = sites;
    } else {
      user.sites = { ...user.sites, [siteId]: [...permissions] };
    }
    return mockResolve(toStaffUser(user));
  }

  updateLoginMethods(id: string, loginMethods: LoginMethod[]): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    if (!loginMethods.length) return mockReject(new Error('last_login_method'));
    user.loginMethods = [...loginMethods];
    return mockResolve(toStaffUser(user));
  }

  updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    user.status = status === 'active' && !user.lastLoginAt && user.invitedAt ? 'invited' : status;
    return mockResolve(toStaffUser(user));
  }

  updateProfile(id: string, profile: IStaffProfile): Promise<IStaffUser> {
    const user = MOCK_USERS_DB.find((candidate) => candidate.id === id && candidate.role !== 'client');
    if (!user) return mockReject(new ApiRefusal('user_not_found'));
    if (!profile.phone && !profile.email) return mockReject(new ApiRefusal('contact_required'));
    const holders = holdersOf({ phone: profile.phone ?? undefined, email: profile.email ?? undefined, exceptUserId: id });
    if (holders.phoneTakenBy !== null) return mockReject(new ApiRefusal('phone_taken'));
    if (holders.emailTakenBy !== null) return mockReject(new ApiRefusal('email_taken'));
    if ((!profile.phone && user.loginMethods.some((method) => method !== 'email_password')) || (!profile.email && user.loginMethods.includes('email_password'))) return mockReject(new ApiRefusal('method_needs_identifier'));
    Object.assign(user, profile, { title: profile.title ?? undefined });
    return mockResolve(toStaffUser(user));
  }

  updateRole(id: string, role: StaffRole): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    user.role = role;
    user.sites = Object.fromEntries(Object.keys(user.sites).map((siteId) => [siteId, [...ROLE_DEFAULT_PERMISSIONS[role]]]));
    return mockResolve(toStaffUser(user));
  }

  updateSecret(id: string, { kind, secret }: IStaffSecret): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    const method = kind === 'pin' ? 'phone_pin' : 'email_password';
    if (kind === 'pin' ? !user.phone : !user.email) return mockReject(new ApiRefusal('method_needs_identifier'));
    if (!user.loginMethods.includes(method)) user.loginMethods.push(method);
    Object.assign(user, kind === 'pin' ? { pin: secret } : { password: secret }, { mustChangeCredential: true, status: 'active' });
    return mockResolve(toStaffUser(user));
  }

  updateOwnership(id: string, isOwner: boolean): Promise<IStaffUser> {
    const user = MOCK_USERS_DB.find((candidate) => candidate.id === id);
    if (!user) return mockReject(new ApiRefusal('user_not_found'));
    if (isOwner && (user.role !== 'management' || user.status !== 'active')) return mockReject(new ApiRefusal('owner_needs_management'));
    if (!isOwner && !MOCK_USERS_DB.some((other) => other.isOwner && other.id !== id && other.status === 'active')) return mockReject(new ApiRefusal('last_owner'));
    user.isOwner = isOwner;
    return mockResolve(toStaffUser(user));
  }

  checkContacts(contact: IContactCheck): Promise<IContactHolders> {
    return mockResolve(holdersOf(contact));
  }

  sendInvitation(id: string): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    invite(user);
    return mockResolve(toStaffUser(user));
  }

  resetCredential(id: string): Promise<void> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    user.mustChangeCredential = true;
    console.info(`[mock] Reset link sent to ${user.email ?? user.phone}`);
    return mockResolve(undefined);
  }
}
