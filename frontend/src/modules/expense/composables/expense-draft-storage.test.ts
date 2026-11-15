import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearExpenseDraft, isWorthKeeping, readExpenseDraft, saveExpenseDraft } from 'expense/composables/expense-draft-storage';
import { draftFrom } from 'expense/composables/expense-draft';

/** The browser's storage, in memory; `refuses` stands for a browser that is full. */
const memoryStorage = (refuses: (value: string) => boolean = () => false) => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string): string | null => items.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      if (refuses(value)) throw new Error('QuotaExceededError');
      items.set(key, value);
    },
    removeItem: (key: string): void => {
      items.delete(key);
    },
  };
};

const blank = () => draftFrom('oj', 'new', null);

describe('Expense draft kept across a reload', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

  it('leaves no draft for a form nobody typed in', () => {
    expect(isWorthKeeping(blank())).toBe(false);
    expect(isWorthKeeping({ ...blank(), description: 'Électricité' })).toBe(true);
  });

  it('gives back what was typed, per person and Site', () => {
    saveExpenseDraft('nadia', 'oj', { mode: 'new', sourceId: null, payload: { ...blank(), description: 'Gasoil', amount: 2350 } });
    expect(readExpenseDraft('nadia', 'oj')?.payload).toMatchObject({ description: 'Gasoil', amount: 2350 });
    expect(readExpenseDraft('nadia', 'bk')).toBeNull();
    expect(readExpenseDraft('hamid', 'oj')).toBeNull();
    clearExpenseDraft('nadia', 'oj');
    expect(readExpenseDraft('nadia', 'oj')).toBeNull();
  });

  it('keeps the draft without its documents when the browser is full, and says so', () => {
    vi.stubGlobal('localStorage', memoryStorage((value) => value.includes('data:image')));
    const document = { id: 'd1', name: 'facture.jpg', url: 'data:image/jpeg;base64,AAAA', isPdf: false, addedBy: 'Nadia', addedAt: '2026-11-16T10:00:00Z' };
    const saved = saveExpenseDraft('nadia', 'oj', { mode: 'new', sourceId: null, payload: { ...blank(), description: 'Bouteilles', documents: [document] } });
    expect(saved?.hasDroppedDocuments).toBe(true);
    expect(readExpenseDraft('nadia', 'oj')?.payload).toMatchObject({ description: 'Bouteilles', documents: [] });
  });
});
