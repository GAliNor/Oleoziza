import { mockResolve } from 'global/services/mock';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import type { ILot, ILotService } from 'lot/types/lot';

export const LOTS_MOCK_DB: ILot[] = structuredClone(LOTS_MOCK);

export default class LotMockService implements ILotService {
  getLots(siteId: string): Promise<ILot[]> {
    return mockResolve(LOTS_MOCK_DB.filter((lot) => lot.siteId === siteId));
  }
}
