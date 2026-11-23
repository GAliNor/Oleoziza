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
  /** Without an open Season nothing can be received. */
  isSeasonOpen: boolean;
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
  areBoxesIgnored: boolean;
  /** Both null when the Press Line is left for later. */
  pressLineId: string | null;
  plannedStartAt: string | null;
  photoUrl?: string;
  receivedBy: string;
}

export interface IReceptionService {
  receiveLot(payload: IReceiveLotPayload): Promise<ILot>;
}

export interface IReceptionStore {
  settings: ISiteReceptionSettings | null;
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
