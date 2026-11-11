import { describe, expect, it } from 'vitest';

import { positionInSeason, priceSegments, seasonMonths } from 'configuration/composables/season-agenda';
import type { IPriceChange } from 'configuration/types/configuration';

const SEASON = { startsOn: '2026-11-01', endsOn: '2027-01-31' };

const change = (id: string, value: number, effectiveFrom: string, isScheduled = false): IPriceChange => ({ id, key: 'millingRate', value, effectiveFrom, by: '', isScheduled });

describe('season agenda', () => {
  it('lists the months a Season covers, across the new year', () => {
    expect(seasonMonths(SEASON)).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('places days across the Season and clamps those outside it', () => {
    expect(positionInSeason(SEASON, '2026-11-01')).toBe(0);
    expect(positionInSeason(SEASON, '2027-01-31')).toBe(1);
    expect(positionInSeason(SEASON, '2026-10-15')).toBe(0);
    expect(positionInSeason(SEASON, '2026-12-16')).toBeCloseTo(0.5, 1);
  });

  it('runs each price version until the next one starts', () => {
    const segments = priceSegments(SEASON, [change('b', 0.6, '2026-12-01T00:00:00Z', true), change('a', 0.5, '2026-11-01T00:00:00Z')], 'millingRate');

    expect(segments.map((segment) => segment.change.id)).toEqual(['a', 'b']);
    expect(segments[0].end).toBe(segments[1].start);
    expect(segments[1].end).toBe(1);
  });

  it('ignores the other prices', () => {
    expect(priceSegments(SEASON, [{ ...change('c', 40, '2026-11-01T00:00:00Z'), key: 'oilPrice' }], 'millingRate')).toEqual([]);
  });
});
