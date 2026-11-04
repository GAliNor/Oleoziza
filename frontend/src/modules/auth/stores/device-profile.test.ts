import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from 'auth/stores/auth';
import { useDeviceProfileStore } from 'auth/stores/device-profile';
import { useSessionStore } from 'global/stores/session';
import type { ISession, Role } from 'global/types/session';

const session = (role: Role): ISession => ({ userId: 'u1', sid: 's1', role, isOwner: false, sites: {}, firstName: 'Hamid', lastName: 'Zerrouki', expiresAt: Date.now() + 60_000 });

describe('device profiles', () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string): string | null => memory.get(key) ?? null,
      setItem: (key: string, value: string): void => void memory.set(key, value),
      removeItem: (key: string): void => void memory.delete(key),
    });
    vi.stubGlobal('navigator', { onLine: true });
    setActivePinia(createPinia());
    useSessionStore().setSession(session('operator'));
    useAuthStore().accessToken = 'token-1';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('remembers an Operator, and keeps it across a reload', async () => {
    await useDeviceProfileStore().save('1111');
    setActivePinia(createPinia());
    useDeviceProfileStore().load();
    expect(useDeviceProfileStore().profiles.map((profile) => profile.firstName)).toEqual(['Hamid']);
  });

  it('never stores the PIN itself', async () => {
    await useDeviceProfileStore().save('1111');
    expect(JSON.stringify(useDeviceProfileStore().profiles)).not.toContain('"1111"');
  });

  it('does not remember Management', async () => {
    useSessionStore().setSession(session('management'));
    await useDeviceProfileStore().save('1111');
    expect(useDeviceProfileStore().profiles).toEqual([]);
  });

  it('keeps one profile per Operator, with the latest token', async () => {
    const store = useDeviceProfileStore();
    await store.save('1111');
    await store.save('2222');
    useAuthStore().accessToken = 'token-2';
    store.updateToken();
    expect(store.profiles.map((profile) => profile.accessToken)).toEqual(['token-2']);
  });

  it('refuses a wrong PIN and an unknown Operator', async () => {
    const store = useDeviceProfileStore();
    await store.save('1111');
    await expect(store.unlock('u1', '9999')).rejects.toEqual({ code: 'invalid_credential' });
    await expect(store.unlock('nobody', '1111')).rejects.toEqual({ code: 'invalid_credential' });
  });

  it('applies the stored token on the right PIN', async () => {
    const store = useDeviceProfileStore();
    await store.save('1111');
    const applyToken = vi.spyOn(useAuthStore(), 'applyToken').mockResolvedValue();
    await store.unlock('u1', '1111');
    expect(applyToken).toHaveBeenCalledWith('token-1');
  });

  it('forgets a profile whose session cannot come back', async () => {
    const store = useDeviceProfileStore();
    await store.save('1111');
    vi.spyOn(useAuthStore(), 'applyToken').mockImplementation(async () => useSessionStore().setSession(null));
    await expect(store.unlock('u1', '1111')).rejects.toEqual({ code: 'session_expired' });
    expect(store.profiles).toEqual([]);
  });

  it('forgets an Operator', async () => {
    const store = useDeviceProfileStore();
    await store.save('1111');
    store.forget('u1');
    expect(store.profiles).toEqual([]);
  });
});
