import { mockReject, mockResolve } from 'global/services/mock';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { MOVEMENTS_MOCK } from 'finance/constants/mock-movements';
import type { IMovement, MovementStatus } from 'finance/types/finance';
import { LOT_STATUSES } from 'lot/constants/lot';
import { ALL_SITES } from 'site/constants/site';
import { amountDue } from 'lot/composables/fee';
import { pressingOn } from 'lot/composables/press-schedule';
import { checkPours, isStorageActive, tankStates } from 'lot/composables/storage';
import { configurationOf } from 'configuration/services/configuration.mock';
import type { IDiscountDecision, IDiscountGift, ILot, ILotMovePayload, ILotSchedule, ILotService, NotificationEvent } from 'lot/types/lot';

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
    const lineId = move.pressLineId ?? lot.pressLineId;
    if (next === 'pressing' && !lineId) return mockReject(new Error('lot_without_line'));
    if (next === 'pressing' && lineId && pressingOn(LOTS_MOCK_DB, lineId, lot.id)) return mockReject(new Error('line_busy'));
    const oil = move.oilLitres ?? lot.oilLitres ?? 0;
    const pours = move.pours ?? [];
    const handed = lot.mode === 'purchase' ? 0 : (move.handedLitres ?? (pours.length ? 0 : oil));
    if (next === 'pressed') {
      const states = tankStates(configurationOf(lot.siteId).tanks, LOTS_MOCK_DB.filter((other) => other.siteId === lot.siteId));
      const problem = checkPours(states, lot, oil, handed, pours);
      if (problem) return mockReject(new Error(`storage_${problem}`));
    }
    appliedMoves.add(move.id);
    const at = new Date().toISOString();
    if (next === 'pressing') lot.pressLineId = lineId;
    lot.status = next;
    lot.moves.push({ status: next, at, by: move.by });
    if (move.oilLitres) lot.oilLitres = move.oilLitres;
    if (move.photoUrl) lot.stepPhotos[next] = move.photoUrl;
    if (next === 'pressed') {
      lot.storages = pours.map((pour, index) => ({ id: `${lot.id}-${move.id}-${index}`, tankId: pour.tankId, litres: pour.litres, withdrawnLitres: 0, from: at, plannedUntil: move.plannedUntil ?? null, endedAt: null, by: move.by }));
      lot.withdrawnLitres = handed;
      notifyClient(lot, 'pressed');
      if (!pours.length) {
        lot.status = 'withdrawn';
        lot.moves.push({ status: 'withdrawn', at, by: move.by });
      }
    }
    if (next === 'withdrawn') {
      lot.withdrawnLitres = lot.oilLitres ?? 0;
      lot.storages.filter(isStorageActive).forEach((storage) => Object.assign(storage, { withdrawnLitres: storage.litres, endedAt: at }));
    }
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

  /** One Discount per Lot, given until it is paid; a refused one may be given again. */
  giveDiscount(lotId: string, gift: IDiscountGift & { by: string }): Promise<ILot> {
    const lot = LOTS_MOCK_DB.find((candidate) => candidate.id === lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    if (appliedMoves.has(gift.id)) return mockResolve(lot);
    if (lot.discount && lot.discount.state !== 'refused') return mockReject(new Error('discount_already_given'));
    if (gift.amountDh <= 0 || gift.amountDh > amountDue(lot)) return mockReject(new Error('discount_too_high'));
    appliedMoves.add(gift.id);
    lot.discount = { amountDh: gift.amountDh, percent: gift.percent, state: gift.isOverLimit ? 'pending' : 'applied', givenBy: gift.by, givenAt: new Date().toISOString() };
    return mockResolve(lot);
  }

  /** A Lot changes Line or planned start until its Pressing starts. */
  scheduleLot(lotId: string, schedule: ILotSchedule): Promise<ILot> {
    const lot = LOTS_MOCK_DB.find((candidate) => candidate.id === lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    if (appliedMoves.has(schedule.id)) return mockResolve(lot);
    if (lot.status !== 'waiting') return mockReject(new Error('lot_already_pressing'));
    appliedMoves.add(schedule.id);
    Object.assign(lot, { pressLineId: schedule.pressLineId, plannedStartAt: schedule.plannedStartAt, isPendingSync: !navigator.onLine });
    return mockResolve(lot);
  }

  clearMissingContact(lotId: string): Promise<ILot> {
    const lot = LOTS_MOCK_DB.find((candidate) => candidate.id === lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    lot.isContactMissing = false;
    return mockResolve(lot);
  }
}
