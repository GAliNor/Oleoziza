import type { ITankSetting } from 'configuration/types/configuration';
import type { ILot, ILotStorage, ITankPour, StorageOwnerKind } from 'lot/types/lot';

const toTenth = (litres: number): number => Math.round(litres * 10) / 10;

/** What sits in a Tank right now: its variety is the one of the oil still in it, none once it is empty. */
export interface ITankState {
  tank: ITankSetting;
  variety: string | null;
  fillLitres: number;
  freeLitres: number;
  entries: { lot: ILot; storage: ILotStorage }[];
}

export const isStorageActive = (storage: Pick<ILotStorage, 'endedAt'>): boolean => !storage.endedAt;

export const storedLeft = (storage: Pick<ILotStorage, 'litres' | 'withdrawnLitres'>): number => toTenth(storage.litres - storage.withdrawnLitres);

/** Purchased olives make the mill's own oil; everything else belongs to the Client. */
export const ownerKindOf = (lot: Pick<ILot, 'mode'>): StorageOwnerKind => (lot.mode === 'purchase' ? 'mill' : 'client');

export const tankStates = (tanks: readonly ITankSetting[], lots: readonly ILot[]): ITankState[] =>
  tanks.map((tank) => {
    const entries = lots.flatMap((lot) => lot.storages.filter((storage) => storage.tankId === tank.id && isStorageActive(storage)).map((storage) => ({ lot, storage })));
    const fillLitres = toTenth(entries.reduce((sum, entry) => sum + storedLeft(entry.storage), 0));
    return { tank, variety: entries[0]?.lot.variety ?? null, fillLitres, freeLitres: toTenth(Math.max(tank.capacityLitres - fillLitres, 0)), entries };
  });

/** A Tank only takes oil of its own variety; an empty one takes any, and the first pour sets it. */
export const canTake = (state: Pick<ITankState, 'variety' | 'freeLitres'>, variety: string): boolean => (state.variety === null || state.variety === variety) && state.freeLitres > 0;

/**
 * Tops up the Tanks of the same variety first, the fullest first so the oil stays together; the rest goes
 * into the smallest empty Tank that fits it, or over the empty ones, largest first, when none does.
 */
export const suggestPours = (states: readonly ITankState[], variety: string, litres: number): ITankPour[] => {
  const pours: ITankPour[] = [];
  let left = toTenth(litres);
  const pour = (state: ITankState): void => {
    if (left <= 0 || state.freeLitres <= 0) return;
    const part = toTenth(Math.min(state.freeLitres, left));
    pours.push({ tankId: state.tank.id, litres: part });
    left = toTenth(left - part);
  };
  states.filter((state) => state.variety === variety).sort((first, second) => second.fillLitres - first.fillLitres).forEach(pour);
  const empty = states.filter((state) => state.variety === null);
  const fitting = [...empty].sort((first, second) => first.freeLitres - second.freeLitres).find((state) => state.freeLitres >= left);
  if (fitting) pour(fitting);
  else [...empty].sort((first, second) => second.freeLitres - first.freeLitres).forEach(pour);
  return pours;
};

export type PourProblem = 'variety' | 'space' | 'total' | 'purchaseHandedOver';

/** Why a split of a Lot's oil can't be saved, or null when it can: same variety, enough room, and every litre accounted for. */
export const checkPours = (states: readonly ITankState[], lot: Pick<ILot, 'variety' | 'mode'>, oilLitres: number, handedLitres: number, pours: readonly ITankPour[]): PourProblem | null => {
  if (lot.mode === 'purchase' && handedLitres > 0) return 'purchaseHandedOver';
  const byTank = new Map<string, number>();
  pours.forEach((pour) => byTank.set(pour.tankId, toTenth((byTank.get(pour.tankId) ?? 0) + pour.litres)));
  for (const [tankId, litres] of byTank) {
    const state = states.find((item) => item.tank.id === tankId);
    if (!state || (state.variety !== null && state.variety !== lot.variety)) return 'variety';
    if (litres > state.freeLitres) return 'space';
  }
  const stored = pours.reduce((sum, pour) => sum + pour.litres, 0);
  return Math.abs(toTenth(stored + handedLitres) - toTenth(oilLitres)) > 0.05 || pours.some((pour) => pour.litres <= 0) ? 'total' : null;
};
