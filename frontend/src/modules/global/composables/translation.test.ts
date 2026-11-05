import { afterEach, describe, expect, it } from 'vitest';

import { i18n } from '~/plugins/i18n';

describe('the translations', () => {
  afterEach(() => {
    i18n.global.locale.value = 'fr';
  });

  it('isolate codes inside Arabic text and keep them on one line, and leave French alone', () => {
    expect(i18n.global.t('finance.label.fees', { codes: 'OJ-2627-0153' })).toBe('Frais OJ-2627-0153');
    i18n.global.locale.value = 'ar';
    expect(i18n.global.t('finance.label.fees', { codes: 'OJ-2627-0153, P-401' })).toBe('رسوم \u2066OJ\u20112627\u20110153\u2069, \u2066P\u2011401\u2069');
  });
});
