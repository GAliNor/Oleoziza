import { describe, expect, it } from 'vitest';

import { seasonScope } from 'season/composables/season-scope';
import type { ISeason } from 'season/types/season';

const TODAY = '2026-11-23';
const season = (label: string, status: ISeason['status'], startsOn: string): ISeason => ({ label, status, startsOn, endsOn: null, closedAt: null }) as ISeason;
const PAST = season('2025-2026', 'closed', '2025-11-01');
const OPEN = season('2026-2027', 'open', '2026-11-01');
const NEXT = season('2027-2028', 'planned', '2027-11-01');

describe('the Season shown to whoever works', () => {
  it.each([
    ['the open one', [PAST, OPEN, NEXT], { key: 'open', season: '2026-2027' }],
    ['the last closed one between two Seasons', [PAST, NEXT], { key: 'offSeason', season: '2025-2026' }],
    ['the prepared one before the first', [NEXT], { key: 'notOpened', season: '2027-2028' }],
    ['none on a fresh install', [], { key: 'none', season: '' }],
  ] as const)('is %s', (_name, seasons, scope) => {
    expect(seasonScope(seasons, TODAY)).toEqual(scope);
  });
});
