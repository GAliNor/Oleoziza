import { LOT_STATUSES } from 'lot/constants/lot';
import type { ILot, ILotMovePayload } from 'lot/types/lot';

/** The Lot one step on, as the phone shows it until the outbox sends the step: the server's version replaces it with the Storages and figures. */
export const advanceLocally = (lot: ILot, move: ILotMovePayload): ILot => {
  const next = LOT_STATUSES[LOT_STATUSES.indexOf(lot.status) + 1] ?? lot.status;
  const at = new Date().toISOString();
  return {
    ...lot,
    status: next,
    oilLitres: move.oilLitres ?? lot.oilLitres,
    pressLineId: move.pressLineId ?? lot.pressLineId,
    moves: [...lot.moves, { status: next, at, by: move.by }],
    isPendingSync: true,
  };
};
