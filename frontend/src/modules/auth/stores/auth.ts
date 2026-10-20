import { defineStore } from 'pinia';

import AuthService from 'auth/services/auth';
import TokenService from 'auth/services/token';
import { useSiteStore } from 'global/stores/site';
import { setAccessToken } from 'global/services/access-token';
import { readStorage, writeStorage } from 'global/composables/storage';
import { createSalt, hashPin, verifyPin } from 'auth/composables/hash-pin';
import { ALL_SITES } from 'global/constants/site';
import { REFRESH_MARGIN_MS, STORAGE_KEYS } from 'auth/constants/auth';
import type {
  CredentialKind,
  IAccessClaims,
  IAuthError,
  IAuthStore,
  IDeviceProfile,
  IInvitation,
  ILoginOptions,
  ILoginPayload,
  ILoginResult,
  IResetPayload,
  IResetRequest,
  ISession,
  Permission,
} from 'auth/types/auth';

const authService = new AuthService();
const tokenService = new TokenService();

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const toSession = (claims: IAccessClaims): ISession => ({
  userId: claims.sub,
  sid: claims.sid,
  role: claims.role,
  isOwner: claims.isOwner,
  sites: claims.sites ?? {},
  title: claims.title,
  firstName: claims.firstName,
  lastName: claims.lastName,
  expiresAt: claims.exp * 1000,
});

export const isAuthError = (error: unknown): error is IAuthError =>
  typeof error === 'object' && error !== null && 'code' in error;

export const useAuthStore = defineStore('auth', {
  state: (): IAuthStore => ({
    session: null,
    accessToken: null,
    mustChangeCredential: false,
    canSkipCredentialChange: false,
    credentialKind: null,
    deviceProfiles: [],
    isReady: false,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.session !== null,
    isStaff: (state): boolean => state.session !== null && state.session.role !== 'client',
    fullName: (state): string => (state.session ? `${state.session.firstName} ${state.session.lastName}` : ''),
    salutation(state): string {
      if (!state.session) return '';
      return state.session.title ? `${state.session.title} ${state.session.lastName}` : this.fullName;
    },
    hasPermission:
      (state) =>
      (permission: Permission, siteId: string | null): boolean => {
        const sites = state.session?.sites ?? {};
        if (!siteId) return false;
        if (siteId === ALL_SITES) {
          const siteIds = Object.keys(sites);
          return siteIds.length > 0 && siteIds.every((id) => sites[id].includes(permission));
        }
        return sites[siteId]?.includes(permission) ?? false;
      },
    can(): (permission: Permission) => boolean {
      return (permission: Permission): boolean => this.hasPermission(permission, useSiteStore().currentSiteId);
    },
  },
  actions: {
    async init(): Promise<void> {
      if (this.isReady) return;
      this.deviceProfiles = readStorage<IDeviceProfile[]>(STORAGE_KEYS.deviceProfiles, []);
      const credentialChange = readStorage<Pick<IAuthStore, 'mustChangeCredential' | 'canSkipCredentialChange' | 'credentialKind'> | null>(
        STORAGE_KEYS.credentialChange,
        null,
      );
      const token = readStorage<string | null>(STORAGE_KEYS.accessToken, null);
      if (token) {
        try {
          await this.applyToken(token);
          Object.assign(this, credentialChange ?? {});
          if (this.isExpired() && navigator.onLine) await this.refresh();
        } catch (error) {
          console.error(error);
          if (!isAuthError(error) || error.code !== 'network') this.clearSession();
        }
      }
      window.addEventListener('online', () => this.refreshIfExpired());
      this.isReady = true;
    },
    async applyToken(token: string): Promise<void> {
      const claims = await tokenService.verify(token);
      this.session = toSession(claims);
      this.accessToken = token;
      setAccessToken(token);
      writeStorage(STORAGE_KEYS.accessToken, token);
      this.scheduleRefresh();
    },
    isExpired(): boolean {
      return !this.session || this.session.expiresAt <= Date.now();
    },
    scheduleRefresh(): void {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (!this.session) return;
      const delay = Math.max(this.session.expiresAt - Date.now() - REFRESH_MARGIN_MS, 0);
      refreshTimer = setTimeout(() => this.refreshIfExpired(true), delay);
    },
    async refreshIfExpired(isDue = false): Promise<void> {
      if (!this.session || !navigator.onLine || (!isDue && !this.isExpired())) return;
      try {
        await this.refresh();
      } catch (error) {
        console.error(error);
      }
    },
    async refresh(): Promise<void> {
      if (!this.session) return;
      try {
        await this.applyToken(await authService.refresh(this.session.sid));
        this.updateDeviceProfileToken();
      } catch (error) {
        if (isAuthError(error) && error.code === 'session_expired') this.clearSession();
        throw error;
      }
    },
    getLoginOptions(identifier: string): Promise<ILoginOptions> {
      return authService.getLoginOptions(identifier);
    },
    requestCode(identifier: string): Promise<void> {
      return authService.requestCode(identifier);
    },
    async login(payload: ILoginPayload): Promise<ILoginResult> {
      const result = await authService.login(payload);
      await this.completeLogin(result, payload.method === 'phone_pin' ? payload.secret : null);
      return result;
    },
    async acceptInvitation(token: string, secret: string): Promise<ILoginResult> {
      const result = await authService.acceptInvitation(token, secret);
      await this.completeLogin(result, result.credentialKind === 'pin' ? secret : null);
      return result;
    },
    getInvitation(token: string): Promise<IInvitation> {
      return authService.getInvitation(token);
    },
    async completeLogin(result: ILoginResult, pin: string | null): Promise<void> {
      useSiteStore().reset();
      await this.applyToken(result.accessToken);
      this.setCredentialChange(result.mustChangeCredential, result.canSkipCredentialChange, result.credentialKind);
      if (pin) await this.saveDeviceProfile(pin);
    },
    setCredentialChange(mustChange: boolean, canSkip: boolean, kind: CredentialKind | null): void {
      this.mustChangeCredential = mustChange;
      this.canSkipCredentialChange = canSkip;
      this.credentialKind = kind;
      writeStorage(STORAGE_KEYS.credentialChange, mustChange ? { mustChangeCredential: mustChange, canSkipCredentialChange: canSkip, credentialKind: kind } : null);
    },
    async changeCredential(kind: CredentialKind, secret: string): Promise<void> {
      await authService.changeCredential(kind, secret);
      this.setCredentialChange(false, false, null);
      if (kind === 'pin') await this.saveDeviceProfile(secret);
    },
    async skipCredentialChange(): Promise<void> {
      await authService.skipCredentialChange();
      this.setCredentialChange(false, false, null);
    },
    requestReset(identifier: string): Promise<IResetRequest> {
      return authService.requestReset(identifier);
    },
    resetCredential(payload: IResetPayload): Promise<void> {
      return authService.resetCredential(payload);
    },
    async saveDeviceProfile(pin: string): Promise<void> {
      if (!this.session || this.session.role !== 'operator' || !this.accessToken) return;
      const salt = createSalt();
      const profile: IDeviceProfile = {
        userId: this.session.userId,
        firstName: this.session.firstName,
        lastName: this.session.lastName,
        salt,
        pinHash: await hashPin(pin, salt),
        accessToken: this.accessToken,
      };
      this.deviceProfiles = [...this.deviceProfiles.filter((item) => item.userId !== profile.userId), profile];
      writeStorage(STORAGE_KEYS.deviceProfiles, this.deviceProfiles);
    },
    updateDeviceProfileToken(): void {
      const profile = this.deviceProfiles.find((item) => item.userId === this.session?.userId);
      if (!profile || !this.accessToken) return;
      profile.accessToken = this.accessToken;
      writeStorage(STORAGE_KEYS.deviceProfiles, this.deviceProfiles);
    },
    async unlockDeviceProfile(userId: string, pin: string): Promise<void> {
      const profile = this.deviceProfiles.find((item) => item.userId === userId);
      if (!profile || !(await verifyPin(pin, profile.salt, profile.pinHash))) {
        throw { code: 'invalid_credential' } as IAuthError;
      }
      useSiteStore().reset();
      await this.applyToken(profile.accessToken);
      this.setCredentialChange(false, false, null);
      await this.refreshIfExpired();
      if (!this.isAuthenticated) {
        this.forgetDeviceProfile(userId);
        throw { code: 'session_expired' } as IAuthError;
      }
    },
    forgetDeviceProfile(userId: string): void {
      this.deviceProfiles = this.deviceProfiles.filter((item) => item.userId !== userId);
      writeStorage(STORAGE_KEYS.deviceProfiles, this.deviceProfiles);
    },
    lock(): void {
      this.clearSession();
    },
    async logout(): Promise<void> {
      const sid = this.session?.sid;
      if (sid) {
        try {
          await authService.logout(sid);
        } catch (error) {
          console.error(error);
        }
      }
      if (this.session) this.forgetDeviceProfile(this.session.userId);
      this.clearSession();
    },
    clearSession(): void {
      if (refreshTimer) clearTimeout(refreshTimer);
      this.session = null;
      this.accessToken = null;
      setAccessToken(null);
      writeStorage(STORAGE_KEYS.accessToken, null);
      this.setCredentialChange(false, false, null);
      useSiteStore().reset();
    },
  },
});
