import type { ISeason, ISeasonIllustration } from 'season/types/season';

export const SEASON_CURRENT_ID = '5e450000-2627-4000-8000-000000000001';
export const SEASON_PAST_ID = '5e450000-2526-4000-8000-000000000001';

/** The same Seasons as the backend demo seed, so mock and API modes show the same agenda. */
export const SEASONS_MOCK: ISeason[] = [
  { id: SEASON_PAST_ID, code: '2526', label: 'Saison 2025-2026', startsOn: '2025-11-01', endsOn: '2026-01-31', status: 'closed', closedAt: '2026-01-31T23:00:00Z', seasonIllustrationId: null, illustrationUrl: null, illustrationDarkUrl: null },
  { id: SEASON_CURRENT_ID, code: '2627', label: 'Saison 2026-2027', startsOn: '2026-11-01', endsOn: '2027-01-31', status: 'open', closedAt: null, seasonIllustrationId: null, illustrationUrl: null, illustrationDarkUrl: null },
];

/** Season Illustrations live in RustFS behind the backend, never in the front, so mock mode offers none. */
export const SEASON_ILLUSTRATIONS_MOCK: ISeasonIllustration[] = [];
