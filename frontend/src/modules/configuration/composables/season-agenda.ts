import { toIsoDate } from 'global/composables/date';
import type { ConfigurationValueKey, IPriceChange } from 'configuration/types/configuration';
import type { ISeason } from 'season/types/season';

export interface IPriceSegment {
  change: IPriceChange;
  start: number;
  end: number;
}

const dayCount = (from: string, to: string): number => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** The Season's last day, three months after its start when no end is set. */
export const seasonEnd = (season: Pick<ISeason, 'startsOn' | 'endsOn'>): string => season.endsOn ?? `${Number(season.startsOn.slice(0, 4)) + 1}-01-31`;

/** Where a day falls across the Season, from 0 (first day) to 1 (last day), clamped. */
export const positionInSeason = (season: Pick<ISeason, 'startsOn' | 'endsOn'>, isoDate: string): number => {
  const length = dayCount(season.startsOn, seasonEnd(season));
  return length > 0 ? Math.min(1, Math.max(0, dayCount(season.startsOn, isoDate) / length)) : 0;
};

/** The months the Season covers, as YYYY-MM. */
export const seasonMonths = (season: Pick<ISeason, 'startsOn' | 'endsOn'>): string[] => {
  const months: string[] = [];
  const end = seasonEnd(season).slice(0, 7);
  let [year, month] = season.startsOn.slice(0, 7).split('-').map(Number);
  while (`${year}-${String(month).padStart(2, '0')}` <= end) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
  return months;
};

/** One price's versions laid end to end across the Season: each runs from its own start to the next one's. */
export const priceSegments = (season: Pick<ISeason, 'startsOn' | 'endsOn'>, changes: IPriceChange[], key: ConfigurationValueKey): IPriceSegment[] => {
  const ordered = changes.filter((change) => change.key === key).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return ordered.map((change, index) => ({
    change,
    start: positionInSeason(season, toIsoDate(change.effectiveFrom)),
    end: ordered[index + 1] ? positionInSeason(season, toIsoDate(ordered[index + 1].effectiveFrom)) : 1,
  }));
};
