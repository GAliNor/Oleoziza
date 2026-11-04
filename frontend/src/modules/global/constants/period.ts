import type { PeriodKey } from 'global/types/period';

export const DEFAULT_PERIOD: PeriodKey = 'week';

export const PERIOD_DAYS: Record<PeriodKey, number> = { today: 1, week: 7, month: 30, season: 42, previous: 42 };

export const SEASON_START = '2026-10-01';

export const PREVIOUS_SEASON = { from: '2025-10-01', to: '2026-03-31' };

export const MOCK_PERIOD_FACTORS: Record<PeriodKey, number> = { today: 0.034, week: 0.21, month: 0.74, season: 1, previous: 1.62 };
