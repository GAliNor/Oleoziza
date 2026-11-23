import { describe, expect, it } from 'vitest';

import { isDayLocked, seasonOfDay } from 'season/composables/season-of-day';
import type { ISeason } from 'season/types/season';

const season = (id: string, startsOn: string, status: ISeason['status'], closedAt: string | null = null): ISeason => ({ id, startsOn, status, closedAt, endsOn: null }) as ISeason;

const PAST = season('past', '2025-11-01', 'closed', '2026-02-10T12:00:00Z');
const CURRENT = season('current', '2026-11-01', 'open');
const NEXT = season('next', '2027-11-01', 'planned');
const SEASONS = [PAST, CURRENT, NEXT];

describe('the Season a payment counts in', () => {
  it.each([
    ['2026-11-23', 'current'],
    ['2026-06-15', 'past'],
    ['2028-01-05', 'current'],
    ['2024-03-01', 'past'],
  ])('paid on %s counts in %s', (day, id) => {
    expect(seasonOfDay(SEASONS, day)?.id).toBe(id);
  });

  it('is the prepared one while none has started, and none without any', () => {
    expect([seasonOfDay([NEXT], '2026-11-23')?.id, seasonOfDay([], '2026-11-23')]).toEqual(['next', undefined]);
  });

  it('locks what came before the Season was closed, not what came after', () => {
    expect([isDayLocked(PAST, '2026-02-09'), isDayLocked(PAST, '2026-02-10'), isDayLocked(CURRENT, '2026-11-02')]).toEqual([true, false, false]);
  });
});
