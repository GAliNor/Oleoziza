import type { ISeason } from 'season/types/season';

export type SeasonDatesProblem = 'season_dates_reversed' | 'season_starts_in_future' | 'season_dates_overlap';

/** Why a Season can't take these dates, as the backend decides it; null when it can. */
export const seasonDatesProblem = (seasons: readonly ISeason[], season: ISeason, startsOn: string, endsOn: string, today: string): SeasonDatesProblem | null => {
  if (endsOn < startsOn) return 'season_dates_reversed';
  if (season.status === 'open' && startsOn !== season.startsOn && startsOn > today) return 'season_starts_in_future';
  const isCrossed = seasons
    .filter((other) => other.id !== season.id)
    .some((other) => (other.startsOn < season.startsOn ? startsOn <= (other.endsOn && other.endsOn > other.startsOn ? other.endsOn : other.startsOn) : endsOn >= other.startsOn));
  return isCrossed ? 'season_dates_overlap' : null;
};
