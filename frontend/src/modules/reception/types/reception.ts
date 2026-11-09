import type { IPressLineSetting, ITankSetting } from 'configuration/types/configuration';
import type { ILot, NotificationChoice, ReceptionMode } from 'lot/types/lot';

export interface ISiteReceptionSettings {
  dailyPricePerKg: number | null;
  millingRatePerKg: number;
  discountLimitPercent: number;
  boxCount: number;
  boxCapacityKg: number;
  pressLines: IPressLineSetting[];
  tanks: ITankSetting[];
}

export interface IReceiveLotPayload {
  id: string;
  siteId: string;
  clientId: string;
  mode: ReceptionMode;
  variety: string;
  netKg: number;
  millingRatePerKg: number;
  notificationChoice: NotificationChoice;
  isContactMissing: boolean;
  boxNumbers: number[];
  pressLineId: string;
  plannedStartAt: string;
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
