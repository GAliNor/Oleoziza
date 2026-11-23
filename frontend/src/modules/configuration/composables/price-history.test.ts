import { describe, expect, it } from 'vitest';

import { priceHistory, priceInForce } from 'configuration/composables/price-history';
import type { ConfigurationValueKey, IPriceChange } from 'configuration/types/configuration';

const change = (id: string, key: ConfigurationValueKey, effectiveFrom: string, isScheduled = false): IPriceChange => ({ id, key, value: 1, effectiveFrom, by: '', isScheduled });

const CHANGES = [change('old', 'millingRate', '2026-11-01'), change('oil', 'oilPrice', '2026-11-10'), change('now', 'millingRate', '2026-11-20'), change('later', 'millingRate', '2026-12-01', true)];

describe('a price and its history', () => {
  it('lists one price only, the latest first', () => {
    expect(priceHistory(CHANGES, 'millingRate').map((item) => item.id)).toEqual(['later', 'now', 'old']);
  });

  it('takes the latest version already started as the one in force', () => {
    expect(priceInForce(CHANGES, 'millingRate')?.id).toBe('now');
    expect(priceInForce(CHANGES, 'discountLimit')).toBeUndefined();
  });
});
