import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withStatus } from 'global/composables/with-status';
import { ApiRefusal } from 'global/services/api-error';
import { useToastStore } from 'global/stores/toast';

interface IFakeStore {
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}

const fakeStore = (): IFakeStore => ({ isLoading: false, isSaving: false, hasError: true });

describe('withStatus', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('raises the flag while the task runs and returns its result', async () => {
    const store = fakeStore();
    let flagDuringTask = false;
    const result = await withStatus(store, 'isLoading', async () => {
      flagDuringTask = store.isLoading;
      return 42;
    });
    expect([flagDuringTask, store.isLoading, result]).toEqual([true, false, 42]);
  });

  it('clears the error flag before the task and sets it on failure', async () => {
    const store = fakeStore();
    await withStatus(store, 'isLoading', async () => 'ok', { errorFlag: 'hasError' });
    expect(store.hasError).toBe(false);
    const result = await withStatus(store, 'isLoading', () => Promise.reject(new Error('down')), { errorFlag: 'hasError' });
    expect([result, store.hasError, store.isLoading]).toEqual([null, true, false]);
  });

  it('reports a failure through a danger toast when given a message', async () => {
    const store = fakeStore();
    await withStatus(store, 'isSaving', () => Promise.reject(new Error('down')), { errorMessage: 'Échec' });
    expect(useToastStore().toasts).toMatchObject([{ message: 'Échec', tone: 'danger' }]);
    expect(store.isSaving).toBe(false);
  });

  it('shows the refusal in words when its code has a translation, else the generic message', async () => {
    await withStatus(fakeStore(), 'isSaving', () => Promise.reject(new ApiRefusal('season_closed')), { errorMessage: 'Échec' });
    await withStatus(fakeStore(), 'isSaving', () => Promise.reject(new ApiRefusal('no_such_code')), { errorMessage: 'Échec' });
    expect(useToastStore().toasts.map((toast) => toast.message)).toEqual(['Cette saison est clôturée : plus aucune modification possible.', 'Échec']);
  });

  it('stays quiet on success', async () => {
    await withStatus(fakeStore(), 'isSaving', async () => true, { errorMessage: 'Échec' });
    expect(useToastStore().toasts).toEqual([]);
  });
});
