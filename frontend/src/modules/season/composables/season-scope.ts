import { seasonOfDay } from 'season/composables/season-of-day';
import type { ISeason } from 'season/types/season';

export interface ISeasonScope {
  /** Key under `season.scope`, with `{season}` for the Season's name. */
  key: 'open' | 'notOpened' | 'offSeason' | 'none';
  season: string;
}

/** The Season the person works in today: the open one; between two, the last one, said to be closed; before the first, the one prepared. */
export const seasonScope = (seasons: readonly ISeason[], today: string): ISeasonScope => {
  const open = seasons.find((season) => season.status === 'open');
  if (open) return { key: 'open', season: open.label };
  const last = seasonOfDay(seasons, today);
  if (!last) return { key: 'none', season: '' };
  return { key: last.status === 'planned' ? 'notOpened' : 'offSeason', season: last.label };
};
