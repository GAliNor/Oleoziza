import { defineStore } from 'pinia';

import { useAuthStore } from 'auth/stores/auth';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { readStorage, writeStorage } from 'global/composables/storage';
import { createSalt, hashPin, verifyPin } from 'auth/composables/hash-pin';
import { hasWebCrypto } from 'global/composables/crypto';
import { STORAGE_KEYS } from 'auth/constants/auth';
import type { IAuthError, IDeviceProfile, IDeviceProfileStore } from 'auth/types/auth';

/** The Operators who can switch back in with their PIN on this device. */
export const useDeviceProfileStore = defineStore('device-profile', {
  state: (): IDeviceProfileStore => ({
    profiles: [],
  }),
  actions: {
    load(): void {
      this.profiles = readStorage<IDeviceProfile[]>(STORAGE_KEYS.deviceProfiles, []);
    },
    persist(): void {
      writeStorage(STORAGE_KEYS.deviceProfiles, this.profiles);
    },
    async save(pin: string): Promise<void> {
      const session = useSessionStore().session;
      const accessToken = useAuthStore().accessToken;
      if (!session || session.role !== 'operator' || !accessToken || !hasWebCrypto()) return;
      const salt = createSalt();
      const profile: IDeviceProfile = { userId: session.userId, firstName: session.firstName, lastName: session.lastName, salt, pinHash: await hashPin(pin, salt), accessToken };
      this.profiles = [...this.profiles.filter((item) => item.userId !== profile.userId), profile];
      this.persist();
    },
    updateToken(): void {
      const profile = this.profiles.find((item) => item.userId === useSessionStore().session?.userId);
      const accessToken = useAuthStore().accessToken;
      if (!profile || !accessToken) return;
      profile.accessToken = accessToken;
      this.persist();
    },
    async unlock(userId: string, pin: string): Promise<void> {
      const authStore = useAuthStore();
      const profile = this.profiles.find((item) => item.userId === userId);
      if (!profile || !(await verifyPin(pin, profile.salt, profile.pinHash))) {
        throw { code: 'invalid_credential' } as IAuthError;
      }
      useSiteStore().reset();
      await authStore.applyToken(profile.accessToken);
      authStore.setCredentialChange(false, false, null);
      await authStore.refreshIfExpired();
      if (!useSessionStore().isAuthenticated) {
        this.forget(userId);
        throw { code: 'session_expired' } as IAuthError;
      }
    },
    forget(userId: string): void {
      this.profiles = this.profiles.filter((item) => item.userId !== userId);
      this.persist();
    },
  },
});
