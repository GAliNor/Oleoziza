import { i18n } from '~/plugins/i18n';

import type { IConsequence } from 'global/types/consequence';
import type { ISeason } from 'season/types/season';

export type SeasonAction = 'open' | 'close' | 'reopen' | 'delete';

/** What an action on a Season will do, and what it leaves as it is. */
export const seasonConsequences = (action: SeasonAction, season: ISeason, openSeason: ISeason | undefined): IConsequence[] => {
  const say = (key: string, isKept = false): IConsequence => ({ text: i18n.global.t(`configuration.season.consequences.${key}`, { label: season.label, current: openSeason?.label ?? '' }), isKept });
  if (action === 'open') return [...(openSeason ? [say('openCloses')] : []), say('openReceives'), say('openPrices')];
  if (action === 'close') return [say('closeStops'), say('closeLocks'), say('closeReopen', true)];
  if (action === 'reopen') return [say('reopenReceives'), say('reopenUnlocks'), say('reopenKeeps', true)];
  return [say('deletePrices'), ...(season.status === 'open' ? [say('deleteStops')] : []), say('deleteRefused', true), say('deleteKeeps', true)];
};
