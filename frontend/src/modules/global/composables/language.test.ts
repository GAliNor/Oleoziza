import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n } from '~/plugins/i18n';

import { chooseLanguage, isRtl, restoreUserLanguage } from 'global/composables/language';
import { formatFullDate } from 'global/composables/date';
import { formatNumber } from 'global/composables/number';
import { formatPhone } from 'global/composables/phone';

describe('the language', () => {
  beforeEach(() => {
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string): string | null => stored.get(key) ?? null,
      setItem: (key: string, value: string): void => void stored.set(key, value),
      removeItem: (key: string): void => void stored.delete(key),
    });
  });

  afterEach(() => {
    i18n.global.locale.value = 'fr';
    vi.unstubAllGlobals();
  });

  it('runs right to left in Arabic only', () => {
    expect(isRtl()).toBe(false);
    chooseLanguage('ar');
    expect(isRtl()).toBe(true);
  });

  it('keeps Western digits and Moroccan month names in Arabic', () => {
    chooseLanguage('ar');
    expect(formatNumber(1840)).toMatch(/^1.?840$/);
    expect(formatFullDate('2026-08-15')).toContain('غشت');
    expect(formatFullDate('2026-08-15')).toMatch(/15/);
  });

  it('isolates a phone number in Arabic, so its groups of digits stay in order', () => {
    expect(formatPhone('+212661234518')).toBe('06 61 23 45 18');
    chooseLanguage('ar');
    expect(formatPhone('+212661234518')).toBe('⁦06 61 23 45 18⁩');
  });

  it('gives each User back the language they chose', () => {
    chooseLanguage('ar', 'hamid');
    chooseLanguage('fr', 'imane');
    restoreUserLanguage('hamid');
    expect(i18n.global.locale.value).toBe('ar');
    restoreUserLanguage('imane');
    expect(i18n.global.locale.value).toBe('fr');
  });

  it('lets a first login keep the language the screen is in', () => {
    chooseLanguage('ar');
    restoreUserLanguage('new-user');
    chooseLanguage('fr');
    restoreUserLanguage('new-user');
    expect(i18n.global.locale.value).toBe('ar');
  });
});
