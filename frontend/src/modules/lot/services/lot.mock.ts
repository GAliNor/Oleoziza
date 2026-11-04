import { mockReject, mockResolve } from 'global/services/mock';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { LOT_STATUSES } from 'lot/constants/lot';
import { ALL_SITES } from 'site/constants/site';
import type { ILot, ILotMove, ILotService } from 'lot/types/lot';

export const LOTS_MOCK_DB: ILot[] = structuredClone(LOTS_MOCK);

const appliedMoves = new Set<string>();

export default class LotMockService implements ILotService {
  getLots(siteId: string): Promise<ILot[]> {
    return mockResolve(siteId === ALL_SITES ? LOTS_MOCK_DB : LOTS_MOCK_DB.filter((lot) => lot.siteId === siteId));
  }

  moveLot(lotId: string, move: ILotMove): Promise<ILot> {
    const lot = LOTS_MOCK_DB.find((candidate) => candidate.id === lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    if (appliedMoves.has(move.id)) return mockResolve(lot);
    const next = LOT_STATUSES[LOT_STATUSES.indexOf(lot.status) + 1];
    if (!next) return mockReject(new Error('lot_already_withdrawn'));
    appliedMoves.add(move.id);
    lot.status = next;
    if (move.oilKg) lot.oilKg = move.oilKg;
    if (next === 'withdrawn') lot.withdrawnKg = lot.oilKg ?? 0;
    lot.isPendingSync = !navigator.onLine;
    return mockResolve(lot);
  }
}
