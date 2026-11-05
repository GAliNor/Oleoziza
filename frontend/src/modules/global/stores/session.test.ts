import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from 'global/stores/session';
import type { ISession, Role } from 'global/types/session';

const session = (role: Role, isOwner = false, userId = 'u1'): ISession => ({ userId, sid: 's', role, isOwner, sites: {}, firstName: 'Khadija', lastName: 'Amrani', expiresAt: 0 });

describe('the session', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it.each([['management', true], ['accountant', true], ['operator', false], ['client', false]] as const)('sets the Backoffice view of a %s to %s', (role, expected) => {
    const store = useSessionStore();
    store.setSession(session(role));
    expect(store.isBackofficeView).toBe(expected);
  });

  it('opens the Backoffice to an Operator only while they jump there', () => {
    const store = useSessionStore();
    store.setSession(session('operator'));
    store.setBackofficeMode(true);
    expect(store.isBackofficeView).toBe(true);
    store.setBackofficeMode(false);
    expect(store.isBackofficeView).toBe(false);
  });

  it('drops the jump when another Operator takes the device or on logout, but not on a token refresh', () => {
    const store = useSessionStore();
    store.setSession(session('operator'));
    store.setBackofficeMode(true);
    store.setSession(session('operator'));
    expect(store.isBackofficeMode).toBe(true);
    store.setSession(session('operator', false, 'u2'));
    expect(store.isBackofficeMode).toBe(false);
    store.setBackofficeMode(true);
    store.setSession(null);
    expect(store.isBackofficeMode).toBe(false);
  });

  it('never lets someone validate what they recorded, except the Owner', () => {
    const store = useSessionStore();
    store.setSession(session('accountant'));
    expect([store.canValidate('Khadija Amrani'), store.canValidate('Hamid Zerrouki')]).toEqual([false, true]);
    store.setSession(session('management', true));
    expect(store.canValidate('Khadija Amrani')).toBe(true);
  });
});
