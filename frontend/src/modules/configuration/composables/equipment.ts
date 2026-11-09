import { i18n } from '~/plugins/i18n';

import { holdsBox } from 'lot/composables/lot-boxes';
import type { IPressLineSetting, ITankSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

export interface IEquipmentInUse {
  highestBox: number;
  tankIds: Set<string>;
  lineIds: Set<string>;
}

/** What a Site's Lots hold right now: a Box with olives, a Tank with stored oil, a Line with a Lot planned or pressing. None of these may be removed. */
export const equipmentInUse = (lots: readonly ILot[], siteId: string): IEquipmentInUse => {
  const own = lots.filter((lot) => lot.siteId === siteId);
  return {
    highestBox: Math.max(0, ...own.filter(holdsBox).flatMap((lot) => lot.boxNumbers)),
    tankIds: new Set(own.flatMap((lot) => lot.storages.filter((storage) => !storage.endedAt).map((storage) => storage.tankId))),
    lineIds: new Set(own.filter((lot) => (lot.status === 'waiting' || lot.status === 'pressing') && lot.pressLineId).map((lot) => lot.pressLineId as string)),
  };
};

export const formatTank = (tank: Pick<ITankSetting, 'number'>): string => i18n.global.t('configuration.tanks.label', { number: tank.number });

export const formatPressLine = (line: Pick<IPressLineSetting, 'number' | 'name'>): string => {
  const label = i18n.global.t('configuration.pressLines.label', { number: line.number });
  return line.name ? `${label} · ${line.name}` : label;
};

/** The next number free for a new Tank or Line: numbers are never reused within a list. */
export const nextNumber = (items: readonly { number: number }[]): number => Math.max(0, ...items.map((item) => item.number)) + 1;
