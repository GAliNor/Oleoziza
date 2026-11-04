import { mockReject, mockResolve } from 'global/services/mock';
import { MOVEMENTS_MOCK } from 'finance/constants/mock-movements';
import { salesMock } from 'finance/constants/mock-sales';
import { ALL_SITES } from 'site/constants/site';
import type { IFinanceService, IMovement, IMovementDecision, ISales } from 'finance/types/finance';
import type { PeriodKey } from 'global/types/period';

const MOVEMENTS_DB: IMovement[] = structuredClone(MOVEMENTS_MOCK);

export default class FinanceMockService implements IFinanceService {
  getMovements(siteId: string): Promise<IMovement[]> {
    return mockResolve(siteId === ALL_SITES ? MOVEMENTS_DB : MOVEMENTS_DB.filter((movement) => movement.siteId === siteId));
  }

  decideMovement(id: string, decision: IMovementDecision): Promise<IMovement> {
    const movement = MOVEMENTS_DB.find((candidate) => candidate.id === id);
    if (!movement) return mockReject(new Error('movement_not_found'));
    if (movement.status === decision.status) return mockResolve(movement);
    const isAllowed = decision.status === 'cancelled' ? movement.status === 'confirmed' && movement.kind === 'payment' : movement.status === 'pending';
    if (!isAllowed) return mockReject(new Error('movement_not_decidable'));
    Object.assign(movement, { status: decision.status, note: decision.note, settlement: decision.settlement, decidedBy: decision.by, decidedAt: new Date().toISOString() });
    return mockResolve(movement);
  }

  getSales(siteId: string, period: PeriodKey): Promise<ISales> {
    return mockResolve(salesMock(siteId, period));
  }
}
