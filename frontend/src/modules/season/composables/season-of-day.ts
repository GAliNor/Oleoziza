import { toIsoDate } from 'global/composables/date';
import type { ISeason } from 'season/types/season';

/** The Season a day counts in, as the backend decides it: the last one started by then, which keeps counting until the next one starts; the earliest one for a day before them all. */
export const seasonOfDay = (seasons: readonly ISeason[], day: string): ISeason | undefined => {
  const started = seasons.filter((season) => season.status !== 'planned').sort((first, second) => second.startsOn.localeCompare(first.startsOn) || Number(second.status === 'open') - Number(first.status === 'open'));
  if (!started.length) return seasons.find((season) => season.status === 'planned');
  return started.find((season) => season.startsOn <= day) ?? started[started.length - 1];
};

/** A closed Season locks what came before it was closed. */
export const isDayLocked = (season: ISeason, day: string): boolean => {
  if (season.status !== 'closed') return false;
  const closedOn = season.closedAt ? toIsoDate(season.closedAt) : season.endsOn;
  return !closedOn || day < closedOn;
};
