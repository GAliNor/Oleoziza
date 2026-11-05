import { mockReject, mockResolve } from 'global/services/mock';
import { CLIENTS_MOCK_DB } from 'client/services/client.mock';
import { configurationOf } from 'configuration/services/configuration.mock';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { millingFee } from 'lot/composables/fee';
import { LAST_LOT_NUMBER_MOCK, SETTINGS_MOCK } from 'reception/constants/mock-reception';
import type { ILot } from 'lot/types/lot';
import type { IReceiveLotPayload, IReceptionService, ISiteReceptionSettings } from 'reception/types/reception';

const lastLotNumbers = structuredClone(LAST_LOT_NUMBER_MOCK);

const nextLotCode = (siteId: string): string => {
  const counter = lastLotNumbers[siteId] ?? (lastLotNumbers[siteId] = { prefix: 'L', number: 0 });
  counter.number += 1;
  return `${counter.prefix}-${String(counter.number).padStart(4, '0')}`;
};

export default class ReceptionMockService implements IReceptionService {
  getSettings(siteId: string): Promise<ISiteReceptionSettings> {
    const { millingRate, discountLimit } = configurationOf(siteId);
    return mockResolve({ ...(SETTINGS_MOCK[siteId] ?? { dailyPricePerKg: null, boxCount: 24, boxCapacityKg: 1000 }), millingRatePerKg: millingRate, discountLimitPercent: discountLimit });
  }

  receiveLot(payload: IReceiveLotPayload): Promise<ILot> {
    const existing = LOTS_MOCK_DB.find((lot) => lot.id === payload.id);
    if (existing) return mockResolve(existing);
    const client = CLIENTS_MOCK_DB.find((option) => option.id === payload.clientId);
    if (!client) return mockReject(new Error('client_not_found'));
    const { photoUrl, discount, ...fields } = payload;
    const receivedAt = new Date().toISOString();
    const lot: ILot = {
      ...fields,
      code: nextLotCode(payload.siteId),
      clientName: client.name,
      status: 'waiting',
      oilLitres: null,
      tankName: null,
      withdrawnLitres: 0,
      dailyPricePerKg: payload.mode === 'purchase' ? (SETTINGS_MOCK[payload.siteId]?.dailyPricePerKg ?? null) : null,
      discount: discount && { ...discount, givenBy: payload.receivedBy, givenAt: receivedAt },
      notifications: [],
      paidDh: 0,
      pendingDh: 0,
      creditDh: 0,
      moves: [{ status: 'waiting', at: receivedAt, by: payload.receivedBy }],
      stepPhotos: photoUrl ? { reception: photoUrl } : {},
      receivedAt,
      isPendingSync: !navigator.onLine,
    };
    lot.creditDh = Math.min(client.creditDh, millingFee(lot));
    client.creditDh -= lot.creditDh;
    if (!client.siteIds.includes(payload.siteId)) client.siteIds.push(payload.siteId);
    LOTS_MOCK_DB.unshift(lot);
    return mockResolve(lot);
  }
}
