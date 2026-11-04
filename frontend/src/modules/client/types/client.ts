import type { LngLat } from 'map';

import type { PeriodKey } from 'global/types/period';
import type { LotStatus } from 'lot/types/lot';

export type ClientKind = 'individual' | 'company';

export interface IClient {
  id: string;
  kind: ClientKind;
  name: string;
  phone: string;
  siteIds: string[];
  isPendingSync: boolean;
}

export interface ICreateClientPayload {
  id: string;
  kind: ClientKind;
  name: string;
  phone: string;
  siteId: string;
}

export interface IClientAccountLine {
  code: string;
  status: LotStatus;
  kg: number;
}

/** Provisional until the Money and Stock data models settle: only what the screens show. */
export interface IClientAccount {
  oilStockKg: number;
  dueDh: number;
  pendingDh: number;
  payoutDh: number;
  history: IClientAccountLine[];
}

export type ClientFollowUp = 'active' | 'at-risk' | 'inactive';

export interface IClientSiteFigures {
  siteId: string;
  siteName: string;
  oilStockKg: number;
  balance: number;
}

export interface IClientLotLine {
  code: string;
  siteId: string;
  siteName: string;
  status: LotStatus;
  kg: number;
  oilKg: number;
  receivedOn: string;
}

export type ClientPeriodKey = Exclude<PeriodKey, 'today'> | 'all';

export interface IClientActivity {
  lots: number;
  oliveKg: number;
  oilKg: number;
  generatedDh: number;
}

export interface ISiteConsumption extends IClientSiteFigures, IClientActivity {
  sharePercent: number;
}

export type ProvinceId = 'oujda-angad' | 'nador' | 'berkane' | 'taourirt' | 'jerada' | 'driouch' | 'guercif' | 'figuig';

export interface IProvince {
  id: ProvinceId;
  name: string;
  kind: 'province' | 'prefecture';
  labelAt: LngLat;
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
  email: string | null;
  oilStockKg: number;
  balance: number;
  sites: IClientSiteFigures[];
  history: IClientLotLine[];
}

export interface IClientService {
  getAll(): Promise<IClient[]>;
  getRecords(): Promise<IClientRecord[]>;
  getAccount(clientId: string): Promise<IClientAccount>;
  create(payload: ICreateClientPayload): Promise<IClient>;
}

export interface IClientStore {
  clients: IClient[];
  accounts: Record<string, IClientAccount>;
  records: IClientRecord[];
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
