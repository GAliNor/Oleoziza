import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from 'global/stores/session';
import type { ISession, Role } from 'global/types/session';

const session = (role: Role, isOwner = false, userId = 'u1'): ISession => ({ userId, role, isOwner, sites: {}, firstName: 'Khadija', lastName: 'Amrani', expiresAt: 0 });

describe('the session', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  });

  it.each([['management', true], ['accountant', true], ['operator', false], ['client', false]] as const)('sets the Backoffice view of a %s to %s', (role, expected) => {
    const store = useSessionStore();
    store.setSession(session(role));
    expect(store.isBackofficeView).toBe(expected);
  });

  it('never opens the Backoffice to an Operator', () => {
    const store = useSessionStore();
    store.setSession(session('operator'));
    store.setOperatorMode(true);
    expect([store.isBackofficeView, store.isOperatorView, store.isOperatorMode]).toEqual([false, true, false]);
  });

  it('lets Management work as an Operator and come back', () => {
    const store = useSessionStore();
    store.setSession(session('management'));
    store.setOperatorMode(true);
    expect([store.isBackofficeView, store.isOperatorView]).toEqual([false, true]);
    store.setOperatorMode(false);
    expect([store.isBackofficeView, store.isOperatorView]).toEqual([true, false]);
  });

  it('keeps the Operator mode across a reload for the same User only, and drops it on logout', () => {
    const store = useSessionStore();
    store.setSession(session('management'));
    store.setOperatorMode(true);
    setActivePinia(createPinia());
    const reloaded = useSessionStore();
    reloaded.setSession(session('management'));
    expect(reloaded.isOperatorMode).toBe(true);
    reloaded.setSession(session('management', false, 'u2'));
    expect(reloaded.isOperatorMode).toBe(false);
    reloaded.setSession(session('management'));
    reloaded.setSession(null);
    reloaded.setSession(session('management'));
    expect(reloaded.isOperatorMode).toBe(false);
  });

  it('never lets someone validate what they recorded, except the Owner', () => {
    const store = useSessionStore();
    store.setSession(session('accountant'));
    expect([store.canValidate('Khadija Amrani'), store.canValidate('Hamid Zerrouki')]).toEqual([false, true]);
    store.setSession(session('management', true));
    expect(store.canValidate('Khadija Amrani')).toBe(true);
  });
});
