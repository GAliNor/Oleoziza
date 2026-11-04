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

export interface IClientService {
  getAll(): Promise<IClient[]>;
  create(payload: ICreateClientPayload): Promise<IClient>;
}

export interface IClientStore {
  clients: IClient[];
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
