import { afterEach, describe, expect, it, vi } from 'vitest';

import { daysSince, formatDateTime, formatDayDate, formatFullDate, formatShortDate, formatTime, shiftDate, todayIso, toIsoDate } from 'global/composables/date';

const clean = (text: string): string => text.replace(/\s/g, ' ');

describe('dates in Morocco time', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts 00:30 in Morocco as the new day, though it is still the day before in UTC', () => {
    expect(toIsoDate('2026-11-03T23:30:00Z')).toBe('2026-11-04');
  });

  it('knows today from Morocco time', () => {
    vi.useFakeTimers({ now: new Date('2026-11-03T23:30:00Z') });
    expect(todayIso()).toBe('2026-11-04');
  });

  it('counts calendar days since a timestamp, not 24-hour spans', () => {
    vi.useFakeTimers({ now: new Date('2026-11-04T08:00:00Z') });
    expect([daysSince('2026-11-04T01:00:00Z'), daysSince('2026-11-03T22:30:00Z'), daysSince('2026-11-01T12:00:00Z')]).toEqual([0, 1, 3]);
  });

  it('shows the same time on any device', () => {
    expect(formatTime('2026-11-03T23:30:00Z')).toBe('00:30');
  });

  it('formats short, day and date-time labels', () => {
    const at = '2026-10-23T15:25:00+01:00';
    expect([formatShortDate(at), formatFullDate(at), formatDayDate(at), formatDateTime(at)].map(clean)).toEqual(['23 oct.', '23 oct. 2026', 'ven. 23 oct.', '23 oct., 15:25']);
  });
});

describe('shiftDate', () => {
  it('moves across months and years', () => {
    expect([shiftDate('2026-11-01', -1), shiftDate('2026-12-31', 1), shiftDate('2026-11-04', 0)]).toEqual(['2026-10-31', '2027-01-01', '2026-11-04']);
  });
});
