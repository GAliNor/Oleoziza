import { i18n } from '~/plugins/i18n';

import type { ILot } from 'lot/types/lot';

/** Olives sit in their Box until pressing starts, which is what frees it. */
const HOLDS_BOX: readonly ILot['status'][] = ['received', 'waiting'];

export const holdsBox = (lot: Pick<ILot, 'status' | 'boxNumbers'>): boolean => HOLDS_BOX.includes(lot.status) && lot.boxNumbers.length > 0;

export const formatBoxes = (boxNumbers: readonly number[]): string => i18n.global.t('lot.box.label', { numbers: boxNumbers.join(', ') });

export const boxesNeeded = (netKg: number, capacityKg: number): number => (netKg > 0 ? Math.ceil(netKg / capacityKg) : 0);

/** Which Lot holds each Box of a Site right now. */
export const boxOccupancy = (lots: readonly ILot[], siteId: string): Map<number, ILot> =>
  new Map(lots.filter((lot) => lot.siteId === siteId && HOLDS_BOX.includes(lot.status)).flatMap((lot) => lot.boxNumbers.map((box): [number, ILot] => [box, lot])));

const consecutiveRuns = (sortedBoxes: readonly number[]): number[][] =>
  sortedBoxes.reduce<number[][]>((runs, box) => {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === box - 1) last.push(box);
    else runs.push([box]);
    return runs;
  }, []);

/**
 * Boxes side by side, so a Client's olives stay together, from the smallest gap that fits: the long
 * gaps stay open for the big Lots. Without such a gap, the lowest free numbers, as many as there are.
 */
export const suggestBoxes = (freeBoxes: readonly number[], count: number): number[] => {
  if (count <= 0) return [];
  const sorted = [...freeBoxes].sort((first, second) => first - second);
  const fitting = consecutiveRuns(sorted)
    .filter((run) => run.length >= count)
    .sort((first, second) => first.length - second.length);
  return fitting.length ? fitting[0].slice(0, count) : sorted.slice(0, count);
};

export const areSideBySide = (boxNumbers: readonly number[]): boolean => boxNumbers.every((box, index) => index === 0 || box === boxNumbers[index - 1] + 1);
