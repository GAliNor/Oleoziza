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
  status: string;
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

export interface IClientService {
  getAll(): Promise<IClient[]>;
  getAccount(clientId: string): Promise<IClientAccount>;
  create(payload: ICreateClientPayload): Promise<IClient>;
}

export interface IClientStore {
  clients: IClient[];
  accounts: Record<string, IClientAccount>;
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
