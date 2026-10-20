import { SignJWT, decodeJwt, importJWK } from 'jose';

import { mockReject, mockResolve } from 'global/services/mock';
import { getAccessToken } from 'global/services/access-token';
import { isEmail } from 'auth/composables/normalize-identifier';
import {
  INVITATIONS_MOCK,
  MOCK_ACCESS_TOKEN_TTL_S,
  MOCK_LOCK_MS,
  MOCK_MAX_FAILED_TRIES,
  MOCK_RESET_LINK_TOKEN,
  MOCK_SIGNING_JWK,
  MOCK_SMS_CODE,
  USERS_MOCK,
} from 'auth/constants/mock-auth';
import type {
  AuthErrorCode,
  CredentialKind,
  IAuthError,
  IAuthService,
  IInvitation,
  ILoginOptions,
  ILoginPayload,
  ILoginResult,
  IResetPayload,
  IResetRequest,
  LoginMethod,
} from 'auth/types/auth';
import type { IMockUser } from 'auth/types/mock-auth';

const REFRESH_STORAGE_KEY = 'oleoziza.mock.refreshSessions';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000;

const users: IMockUser[] = structuredClone(USERS_MOCK);
const invitations = structuredClone(INVITATIONS_MOCK);
const failedTries = new Map<string, { count: number; lockedUntil: number | null }>();
const skippedCredentialChange = new Set<string>();
let pendingEmailResetUserId: string | null = null;

const fail = (code: AuthErrorCode, lockedUntil?: number): Promise<never> =>
  mockReject({ code, ...(lockedUntil ? { lockedUntil: new Date(lockedUntil).toISOString() } : {}) } as IAuthError);

const findUser = (identifier: string): IMockUser | undefined =>
  users.find((user) => (isEmail(identifier) ? user.email === identifier : user.phone === identifier));

const fitsIdentifier = (method: LoginMethod, identifier: string): boolean =>
  isEmail(identifier) ? method === 'email_password' : method !== 'email_password';

const readRefreshSessions = (): Record<string, { userId: string; expiresAt: number }> => {
  try {
    return JSON.parse(localStorage.getItem(REFRESH_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const writeRefreshSessions = (sessions: Record<string, { userId: string; expiresAt: number }>): void => {
  localStorage.setItem(REFRESH_STORAGE_KEY, JSON.stringify(sessions));
};

const signAccessToken = async (user: IMockUser, sid: string): Promise<string> => {
  const key = await importJWK(MOCK_SIGNING_JWK, 'ES256');
  return new SignJWT({
    sid,
    role: user.role,
    isOwner: user.isOwner,
    sites: user.sites,
    title: user.title,
    firstName: user.firstName,
    lastName: user.lastName,
  })
    .setProtectedHeader({ alg: 'ES256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MOCK_ACCESS_TOKEN_TTL_S)
    .sign(key);
};

const openSession = async (user: IMockUser, method: LoginMethod | null): Promise<ILoginResult> => {
  const sid = crypto.randomUUID();
  writeRefreshSessions({ ...readRefreshSessions(), [sid]: { userId: user.id, expiresAt: Date.now() + REFRESH_TTL_MS } });
  failedTries.delete(user.id);
  user.status = 'active';
  const credentialKind: CredentialKind | null =
    method === 'email_password' ? 'password' : user.loginMethods.includes('phone_pin') ? 'pin' : null;
  return {
    accessToken: await signAccessToken(user, sid),
    mustChangeCredential: user.mustChangeCredential && credentialKind !== null,
    canSkipCredentialChange: user.role === 'client' && !skippedCredentialChange.has(user.id),
    credentialKind,
    canOfferPin: method === 'phone_otp' && user.loginMethods.includes('phone_pin') && !user.pin,
  };
};

const currentUser = (): IMockUser | undefined => {
  const token = getAccessToken();
  return token ? users.find((user) => user.id === decodeJwt(token).sub) : undefined;
};

const recordFailure = (user: IMockUser, code: AuthErrorCode): Promise<never> => {
  const tries = failedTries.get(user.id) ?? { count: 0, lockedUntil: null };
  tries.count += 1;
  if (tries.count >= MOCK_MAX_FAILED_TRIES) {
    tries.lockedUntil = Date.now() + MOCK_LOCK_MS;
    tries.count = 0;
  }
  failedTries.set(user.id, tries);
  return tries.lockedUntil ? fail('locked', tries.lockedUntil) : fail(code);
};

const checkSecret = (user: IMockUser, method: LoginMethod, secret: string): boolean => {
  if (method === 'phone_pin') return user.pin !== null && user.pin === secret;
  if (method === 'email_password') return user.password !== null && user.password === secret;
  return secret === MOCK_SMS_CODE;
};

const setSecret = (user: IMockUser, kind: CredentialKind, secret: string): void => {
  if (kind === 'pin') user.pin = secret;
  else user.password = secret;
  user.mustChangeCredential = false;
};

export default class AuthMockService implements IAuthService {
  getLoginOptions(identifier: string): Promise<ILoginOptions> {
    const user = findUser(identifier);
    if (!user || user.status === 'invited') return fail('unknown_identifier');
    if (user.status === 'disabled') return fail('disabled');
    const loginMethods = user.loginMethods.filter(
      (method) => fitsIdentifier(method, identifier) && (method !== 'phone_pin' || user.pin !== null),
    );
    if (!loginMethods.length) return fail('method_not_allowed');
    return mockResolve({ identifier, loginMethods });
  }

  requestCode(identifier: string): Promise<void> {
    return findUser(identifier) ? mockResolve(undefined) : fail('unknown_identifier');
  }

  async login({ identifier, method, secret }: ILoginPayload): Promise<ILoginResult> {
    const user = findUser(identifier);
    if (!user || user.status === 'invited') return fail('unknown_identifier');
    if (user.status === 'disabled') return fail('disabled');
    if (!user.loginMethods.includes(method) || !fitsIdentifier(method, identifier)) return fail('method_not_allowed');
    const lockedUntil = failedTries.get(user.id)?.lockedUntil;
    if (lockedUntil && lockedUntil > Date.now()) return fail('locked', lockedUntil);
    if (!checkSecret(user, method, secret)) {
      return recordFailure(user, method === 'phone_otp' ? 'invalid_code' : 'invalid_credential');
    }
    return mockResolve(await openSession(user, method));
  }

  async refresh(sid: string): Promise<string> {
    const sessions = readRefreshSessions();
    const session = sessions[sid];
    const user = session && users.find((candidate) => candidate.id === session.userId);
    if (!session || session.expiresAt < Date.now() || !user || user.status !== 'active') {
      delete sessions[sid];
      writeRefreshSessions(sessions);
      return fail('session_expired');
    }
    writeRefreshSessions({ ...sessions, [sid]: { userId: user.id, expiresAt: Date.now() + REFRESH_TTL_MS } });
    return mockResolve(await signAccessToken(user, sid));
  }

  logout(sid: string): Promise<void> {
    const sessions = readRefreshSessions();
    delete sessions[sid];
    writeRefreshSessions(sessions);
    return mockResolve(undefined);
  }

  changeCredential(kind: CredentialKind, secret: string): Promise<void> {
    const user = currentUser();
    if (!user) return fail('session_expired');
    setSecret(user, kind, secret);
    return mockResolve(undefined);
  }

  skipCredentialChange(): Promise<void> {
    const user = currentUser();
    if (!user) return fail('session_expired');
    skippedCredentialChange.add(user.id);
    return mockResolve(undefined);
  }

  getInvitation(token: string): Promise<IInvitation> {
    const invitation = invitations.find((candidate) => candidate.token === token);
    const user = invitation && users.find((candidate) => candidate.id === invitation.userId);
    if (!invitation || !user) return fail('invalid_invitation');
    return mockResolve({
      firstName: user.firstName,
      lastName: user.lastName,
      invitedBy: invitation.invitedBy,
      credentialKind: user.loginMethods.includes('phone_pin') ? 'pin' : 'password',
      identifier: user.phone ?? user.email ?? '',
    });
  }

  async acceptInvitation(token: string, secret: string): Promise<ILoginResult> {
    const index = invitations.findIndex((candidate) => candidate.token === token);
    const user = index >= 0 ? users.find((candidate) => candidate.id === invitations[index].userId) : undefined;
    if (!user) return fail('invalid_invitation');
    invitations.splice(index, 1);
    setSecret(user, user.loginMethods.includes('phone_pin') ? 'pin' : 'password', secret);
    return mockResolve(await openSession(user, null));
  }

  requestReset(identifier: string): Promise<IResetRequest> {
    const user = findUser(identifier);
    if (!user || user.status !== 'active') return fail('unknown_identifier');
    if (user.role !== 'client') return fail('staff_reset');
    if (isEmail(identifier)) {
      if (!user.loginMethods.includes('email_password')) return fail('method_not_allowed');
      pendingEmailResetUserId = user.id;
      return mockResolve({ channel: 'email', credentialKind: 'password' });
    }
    if (!user.loginMethods.includes('phone_pin')) return fail('method_not_allowed');
    return mockResolve({ channel: 'sms', credentialKind: 'pin' });
  }

  resetCredential({ identifier, code, resetToken, secret }: IResetPayload): Promise<void> {
    if (resetToken !== undefined) {
      const user = users.find((candidate) => candidate.id === pendingEmailResetUserId);
      if (resetToken !== MOCK_RESET_LINK_TOKEN || !user) return fail('invalid_reset');
      pendingEmailResetUserId = null;
      setSecret(user, 'password', secret);
      failedTries.delete(user.id);
      return mockResolve(undefined);
    }
    const user = identifier ? findUser(identifier) : undefined;
    if (!user) return fail('unknown_identifier');
    if (code !== MOCK_SMS_CODE) return recordFailure(user, 'invalid_code');
    setSecret(user, 'pin', secret);
    failedTries.delete(user.id);
    return mockResolve(undefined);
  }
}
