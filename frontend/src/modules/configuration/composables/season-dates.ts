import { harvestYear } from 'season/composables/harvest-year';
import type { ISeason } from 'season/types/season';

/** The Season's last day, three months after its start when no end is set. */
export const seasonEnd = (season: Pick<ISeason, 'startsOn' | 'endsOn'>): string => season.endsOn ?? `${harvestYear(season.startsOn) + 1}-01-31`;
