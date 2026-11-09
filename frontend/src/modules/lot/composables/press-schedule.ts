import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

const HOUR_MS = 3_600_000;

const isQueued = (lot: Pick<ILot, 'status'>): boolean => lot.status === 'waiting' || lot.status === 'pressing';

/** The Lots planned on a Line and not yet pressed, the one pressing first, then by planned start. */
export const lineQueue = (lots: readonly ILot[], lineId: string): ILot[] =>
  lots
    .filter((lot) => lot.pressLineId === lineId && isQueued(lot))
    .sort((first, second) => (first.status === second.status ? (first.plannedStartAt ?? '').localeCompare(second.plannedStartAt ?? '') : first.status === 'pressing' ? -1 : 1));

/** The Line with the shortest queue, the lowest number on a tie. */
export const suggestLine = (lines: readonly IPressLineSetting[], lots: readonly ILot[]): IPressLineSetting | null =>
  [...lines].sort((first, second) => lineQueue(lots, first.id).length - lineQueue(lots, second.id).length || first.number - second.number)[0] ?? null;

/** The next whole hour after the Line's last planned start, or after now when the Line is free: one Lot an hour, until someone changes it. */
export const suggestStart = (lots: readonly ILot[], lineId: string, now: Date): string => {
  const planned = lineQueue(lots, lineId)
    .map((lot) => (lot.plannedStartAt ? new Date(lot.plannedStartAt).getTime() + HOUR_MS : 0))
    .reduce((latest, at) => Math.max(latest, at), 0);
  const from = Math.max(planned, now.getTime());
  return new Date(Math.ceil(from / HOUR_MS) * HOUR_MS).toISOString();
};

/** The Lot pressing on a Line right now, if any: a Line presses one Lot at a time. */
export const pressingOn = (lots: readonly ILot[], lineId: string, exceptLotId?: string): ILot | undefined =>
  lots.find((lot) => lot.pressLineId === lineId && lot.status === 'pressing' && lot.id !== exceptLotId);

/** Ahead of this Lot on its Line: the one pressing and those planned earlier. */
export const lotsAhead = (lots: readonly ILot[], lot: ILot): number => {
  if (!lot.pressLineId) return 0;
  const queue = lineQueue(lots, lot.pressLineId);
  return Math.max(queue.findIndex((item) => item.id === lot.id), 0);
};

export const isLate = (lot: Pick<ILot, 'status' | 'plannedStartAt'>, now: Date): boolean => lot.status === 'waiting' && !!lot.plannedStartAt && new Date(lot.plannedStartAt).getTime() < now.getTime();
