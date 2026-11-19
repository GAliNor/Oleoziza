import { createPinia, setActivePinia } from 'pinia';
import { createApp } from 'vue';
import { trackCreatedStores } from '~/plugins/pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthMockService from 'auth/services/auth.mock';
import { useAuthStore } from 'auth/stores/auth';
import { useExpenseStore } from 'expense/stores/expense';
import type { IExpense } from 'expense/types/expense';
import { useSessionStore } from 'global/stores/session';
import type { ISession } from 'global/types/session';

const SESSION: ISession = { userId: 'u1', role: 'operator', isOwner: false, sites: {}, firstName: 'Hamid', lastName: 'Ziani', expiresAt: 0 };

describe('auth store refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    useSessionStore().setSession(SESSION);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['session_expired', 'disabled'])('expires the session when the server answers %s', async (code) => {
    vi.spyOn(AuthMockService.prototype, 'refresh').mockRejectedValue({ code });
    await expect(useAuthStore().refresh()).rejects.toEqual({ code });
    expect([useSessionStore().session, useSessionStore().hasExpired]).toEqual([null, true]);
  });

  it('keeps the session through a network failure, so an offline Operator keeps working', async () => {
    vi.spyOn(AuthMockService.prototype, 'refresh').mockRejectedValue({ code: 'network' });
    await expect(useAuthStore().refresh()).rejects.toEqual({ code: 'network' });
    expect([useSessionStore().session?.userId, useSessionStore().hasExpired]).toEqual(['u1', false]);
  });
});

describe('auth store sign-out', () => {
  beforeEach(() => {
    const pinia = createPinia();
    pinia.use(trackCreatedStores);
    createApp({}).use(pinia);
    setActivePinia(pinia);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    useSessionStore().setSession(SESSION);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('leaves nothing of the last person in the business stores, so the next one on this browser reads from the server', () => {
    const expenseStore = useExpenseStore();
    expenseStore.current = { id: 'e1' } as IExpense;

    useAuthStore().clearSession();

    expect([expenseStore.current, useSessionStore().session]).toEqual([null, null]);
  });
});
