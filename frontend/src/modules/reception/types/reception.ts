import type { DiscountState, ILot, NotificationChoice, ReceptionMode } from 'lot/types/lot';

export interface ISiteReceptionSettings {
  dailyPricePerKg: number | null;
  millingRatePerKg: number;
  discountLimitPercent: number;
  boxCount: number;
  boxCapacityKg: number;
}

export interface IReceiveLotPayload {
  id: string;
  siteId: string;
  clientId: string;
  mode: ReceptionMode;
  variety: string;
  netKg: number;
  millingRatePerKg: number;
  discount: { amountDh: number; percent: number; state: DiscountState } | null;
  notificationChoice: NotificationChoice;
  isContactMissing: boolean;
  boxNumbers: number[];
  photoUrl?: string;
  receivedBy: string;
}

export interface IReceptionService {
  getSettings(siteId: string): Promise<ISiteReceptionSettings>;
  receiveLot(payload: IReceiveLotPayload): Promise<ILot>;
}

export interface IReceptionStore {
  settings: ISiteReceptionSettings | null;
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
