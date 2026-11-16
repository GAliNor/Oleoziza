import type { ILot } from 'lot/types/lot';
import type { IReceiveLotPayload } from 'reception/types/reception';

/** The Lot shown the moment a Reception is saved, before the server gives its code: waiting, pending, owing nothing yet. */
export const buildPendingLot = (payload: IReceiveLotPayload, clientName: string): ILot => {
  const receivedAt = new Date().toISOString();
  return {
    id: payload.id,
    code: '',
    siteId: payload.siteId,
    clientId: payload.clientId,
    clientName,
    mode: payload.mode,
    variety: payload.variety,
    status: 'waiting',
    netKg: payload.netKg,
    oilLitres: null,
    withdrawnLitres: 0,
    boxNumbers: [...payload.boxNumbers],
    pressLineId: payload.pressLineId,
    plannedStartAt: payload.plannedStartAt,
    storages: [],
    dailyPricePerKg: null,
    millingRatePerKg: payload.millingRatePerKg,
    discount: null,
    notificationChoice: payload.notificationChoice,
    isContactMissing: payload.isContactMissing,
    notifications: [],
    paidDh: 0,
    pendingDh: 0,
    creditDh: 0,
    moves: [{ status: 'waiting', at: receivedAt, by: payload.receivedBy }],
    stepPhotos: payload.photoUrl ? { reception: payload.photoUrl } : {},
    receivedAt,
    receivedBy: payload.receivedBy,
    isPendingSync: true,
  };
};
