import { mockReject, mockResolve } from 'global/services/mock';
import { CLIENTS_MOCK_DB } from 'global/services/client.mock';
import { LAST_LOT_NUMBER_MOCK, LOTS_MOCK, SETTINGS_MOCK } from 'reception/constants/mock-reception';
import { SCALE_READ_DELAY_MS } from 'reception/constants/reception';
import type {
  IAddWeighingPayload,
  ILot,
  IOpenReceptionPayload,
  IReceptionService,
  ISiteReceptionSettings,
} from 'reception/types/reception';

const lots: ILot[] = structuredClone(LOTS_MOCK);
const lastLotNumbers = structuredClone(LAST_LOT_NUMBER_MOCK);

const isPendingSync = (): boolean => !navigator.onLine;

const nextLotCode = (siteId: string): string => {
  const counter = lastLotNumbers[siteId] ?? (lastLotNumbers[siteId] = { prefix: 'L', number: 0 });
  counter.number += 1;
  return `${counter.prefix}-${String(counter.number).padStart(4, '0')}`;
};

const findLot = (lotId: string): ILot | undefined => lots.find((lot) => lot.id === lotId);

export default class ReceptionMockService implements IReceptionService {
  getLots(siteId: string): Promise<ILot[]> {
    return mockResolve(lots.filter((lot) => lot.siteId === siteId));
  }

  getSettings(siteId: string): Promise<ISiteReceptionSettings> {
    return mockResolve(SETTINGS_MOCK[siteId] ?? { containerTareKg: { sac: 0.6, caisse: 2 }, dailyPricePerKg: null });
  }

  openReception(payload: IOpenReceptionPayload): Promise<ILot> {
    const existing = findLot(payload.id);
    if (existing) return mockResolve(existing);
    const client = CLIENTS_MOCK_DB.find((option) => option.id === payload.clientId);
    if (!client) return mockReject(new Error('client_not_found'));
    const lot: ILot = {
      ...payload,
      code: nextLotCode(payload.siteId),
      clientName: client.name,
      status: 'received',
      netKg: 0,
      dailyPricePerKg: payload.mode === 'purchase' ? (SETTINGS_MOCK[payload.siteId]?.dailyPricePerKg ?? null) : null,
      weighings: [],
      receivedAt: new Date().toISOString(),
      finishedAt: null,
      isPendingSync: isPendingSync(),
    };
    if (!client.siteIds.includes(payload.siteId)) client.siteIds.push(payload.siteId);
    lots.unshift(lot);
    return mockResolve(lot);
  }

  addWeighing(lotId: string, payload: IAddWeighingPayload): Promise<ILot> {
    const lot = findLot(lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    if (lot.status !== 'received') return mockReject(new Error('lot_not_received'));
    if (!lot.weighings.some((weighing) => weighing.id === payload.id)) {
      lot.weighings.push({ ...payload, recordedAt: new Date().toISOString(), isPendingSync: isPendingSync() });
      lot.netKg = lot.weighings.reduce((total, weighing) => total + weighing.netKg, 0);
      lot.isPendingSync = lot.isPendingSync || isPendingSync();
    }
    return mockResolve(lot);
  }

  finishReception(lotId: string): Promise<ILot> {
    const lot = findLot(lotId);
    if (!lot) return mockReject(new Error('lot_not_found'));
    if (!lot.weighings.length) return mockReject(new Error('no_weighing'));
    if (lot.status === 'received') {
      lot.status = 'waiting';
      lot.finishedAt = new Date().toISOString();
    }
    return mockResolve(lot);
  }

  readScale(): Promise<number> {
    return new Promise((resolve) => setTimeout(() => resolve(Math.round(280 + Math.random() * 640)), SCALE_READ_DELAY_MS));
  }
}
