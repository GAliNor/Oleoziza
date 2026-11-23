import { describe, expect, it } from 'vitest';

import { seasonDatesProblem } from 'season/composables/season-dates-problem';
import type { ISeason } from 'season/types/season';

const season = (id: string, status: ISeason['status'], startsOn: string, endsOn: string): ISeason => ({ id, status, startsOn, endsOn }) as ISeason;
const PAST = season('past', 'closed', '2025-11-01', '2026-01-31');
const CURRENT = season('current', 'open', '2026-11-01', '2027-01-31');
const NEXT = season('next', 'planned', '2027-11-01', '2028-01-31');
const TODAY = '2026-11-23';

describe('the dates of a Season', () => {
  it.each([
    ['moved earlier', CURRENT, '2026-10-15', '2027-02-28', null],
    ['ending before it starts', CURRENT, '2026-11-01', '2026-10-31', 'season_dates_reversed'],
    ['open, starting tomorrow', CURRENT, '2026-11-24', '2027-01-31', 'season_starts_in_future'],
    ['over the Season before', CURRENT, '2026-01-31', '2027-01-31', 'season_dates_overlap'],
    ['over the Season after', CURRENT, '2026-11-01', '2027-11-01', 'season_dates_overlap'],
    ['prepared, moved ahead', NEXT, '2027-12-01', '2028-02-28', null],
  ] as const)('%s', (_name, moved, startsOn, endsOn, problem) => {
    expect(seasonDatesProblem([PAST, CURRENT, NEXT], moved, startsOn, endsOn, TODAY)).toBe(problem);
  });

  it('may keep the start of a Season opened early', () => {
    const early = season('early', 'open', '2026-12-01', '2027-01-31');
    expect(seasonDatesProblem([early], early, '2026-12-01', '2027-02-15', TODAY)).toBeNull();
  });
});
