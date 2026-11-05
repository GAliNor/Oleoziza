import type { PeriodKey } from 'global/types/period';
import type { LotStatus } from 'lot/types/lot';
import type { ILocation, ProvinceId } from 'territory/types/territory';

export type ClientKind = 'individual' | 'company';

export interface IClient {
  id: string;
  kind: ClientKind;
  name: string;
  phone: string;
  email: string | null;
  identifier: string | null;
  creditDh: number;
  siteIds: string[];
  isPendingSync: boolean;
}

export interface IClientContact {
  phone?: string;
  email?: string;
}

export interface ICreateClientPayload {
  id: string;
  kind: ClientKind;
  name: string;
  phone: string;
  siteId: string;
  identifier: string | null;
  email: string | null;
  location: ILocation;
}

export interface IClientAccountLine {
  code: string;
  status: LotStatus;
  kg: number;
}

/** Provisional until the Money and Stock data models settle: only what the screens show. */
export interface IClientAccount {
  oilStockLitres: number;
  dueDh: number;
  pendingDh: number;
  payoutDh: number;
  history: IClientAccountLine[];
}

export type ClientFollowUp = 'active' | 'at-risk' | 'inactive';

export interface IClientSiteFigures {
  siteId: string;
  siteName: string;
  oilStockLitres: number;
  balance: number;
}

export interface IClientLotLine {
  code: string;
  siteId: string;
  siteName: string;
  status: LotStatus;
  kg: number;
  oilLitres: number;
  millingRatePerKg: number;
  variety: string;
  season: string;
  receivedOn: string;
}

export type ClientPeriodKey = Exclude<PeriodKey, 'today'> | 'all';

export interface IClientActivity {
  lots: number;
  oliveKg: number;
  oilLitres: number;
  generatedDh: number;
}

export interface ISiteConsumption extends IClientSiteFigures, IClientActivity {
  sharePercent: number;
}

/** A Client as Management sees it, across every Site. Provisional until the Money and Stock data models settle. */
export interface IClientRecord {
  id: string;
  name: string;
  kind: ClientKind;
  followUp: ClientFollowUp;
  phone: string;
  identifier: string;
  region: string;
  province: ProvinceId | null;
  address: string | null;
  email: string | null;
  oilStockLitres: number;
  balance: number;
  sites: IClientSiteFigures[];
  history: IClientLotLine[];
}

export interface IClientService {
  getAll(): Promise<IClient[]>;
  getRecords(): Promise<IClientRecord[]>;
  getAccount(clientId: string): Promise<IClientAccount>;
  create(payload: ICreateClientPayload): Promise<IClient>;
  updateContact(clientId: string, contact: IClientContact): Promise<IClient>;
  getHistory(clientId: string, siteId: string): Promise<IClientLotLine[]>;
}

export interface IClientStore {
  clients: IClient[];
  accounts: Record<string, IClientAccount>;
  records: IClientRecord[];
  histories: Record<string, IClientLotLine[]>;
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
