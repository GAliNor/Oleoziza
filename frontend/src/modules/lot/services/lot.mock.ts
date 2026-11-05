import { mockReject, mockResolve } from 'global/services/mock';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { MOVEMENTS_MOCK } from 'finance/constants/mock-movements';
import type { IMovement, MovementStatus } from 'finance/types/finance';
import { LOT_STATUSES } from 'lot/constants/lot';
import { ALL_SITES } from 'site/constants/site';
import type { IDiscountDecision, ILot, ILotMovePayload, ILotService, NotificationEvent } from 'lot/types/lot';

export const LOTS_MOCK_DB: ILot[] = structuredClone(LOTS_MOCK);

/** Sets what is paid and waiting on each Lot from the Payments linked to it. */
export const syncLotPayments = (movements: readonly IMovement[]): void => {
  LOTS_MOCK_DB.forEach((lot) => {
    const linkedAt = (status: MovementStatus): number =>
      movements.filter((movement) => movement.status === status).flatMap((movement) => movement.lotLinks).filter((link) => link.lotId === lot.id).reduce((sum, link) => sum + link.amount, 0);
    lot.paidDh = linkedAt('confirmed');
    lot.pendingDh = linkedAt('pending');
  });
};

syncLotPayments(MOVEMENTS_MOCK);

const appliedMoves = new Set<string>();

/** Simulates the message: a Lot whose contact is missing shows it could not go. */
export const notifyClient = (lot: ILot, event: NotificationEvent): void => {
  if (lot.notificationChoice === 'none') return;
  lot.notifications.push({ event, channel: lot.notificationChoice, at: new Date().toISOString(), isFailed: lot.isContactMissing });
};

export default class LotMockService implements ILotService {
  getLots(siteId: string): Promise<ILot[]> {
    return mockResolve(siteId === ALL_SITES ? LOTS_MOCK_DB : LOTS_MOCK_DB.filter((lot) => lot.siteId === siteId));
  }

  moveLot(lotId: string, move: ILotMovePayload): Promise<ILot> {
    const lot = LOTS_MOCK_DB.find((candidate) => candidate.id === lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    if (appliedMoves.has(move.id)) return mockResolve(lot);
    const next = LOT_STATUSES[LOT_STATUSES.indexOf(lot.status) + 1];
    if (!next) return mockReject(new Error('lot_already_withdrawn'));
    appliedMoves.add(move.id);
    lot.status = next;
    lot.moves.push({ status: next, at: new Date().toISOString(), by: move.by });
    if (move.oilLitres) lot.oilLitres = move.oilLitres;
    if (move.photoUrl) lot.stepPhotos[next] = move.photoUrl;
    if (next === 'withdrawn') lot.withdrawnLitres = lot.oilLitres ?? 0;
    if (next === 'pressed') notifyClient(lot, 'pressed');
    lot.isPendingSync = !navigator.onLine;
    return mockResolve(lot);
  }

  decideDiscount(lotId: string, decision: IDiscountDecision & { by: string }): Promise<ILot> {
    const lot = LOTS_MOCK_DB.find((candidate) => candidate.id === lotId);
    if (!lot?.discount) return mockReject(new Error('lot_not_found'));
    if (appliedMoves.has(decision.id)) return mockResolve(lot);
    if (lot.discount.state !== 'pending') return mockReject(new Error('discount_already_decided'));
    appliedMoves.add(decision.id);
    lot.discount = { ...lot.discount, state: decision.isApproved ? 'approved' : 'refused', decidedBy: decision.by, decidedAt: new Date().toISOString(), refusalReason: decision.reason };
    return mockResolve(lot);
  }

  clearMissingContact(lotId: string): Promise<ILot> {
    const lot = LOTS_MOCK_DB.find((candidate) => candidate.id === lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    lot.isContactMissing = false;
    return mockResolve(lot);
  }
}
