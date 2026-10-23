export type ReceptionMode = 'service' | 'purchase';
export type ContainerKind = 'sac' | 'caisse';
export type WeighingKind = 'gross' | 'net';
export type WeighingSource = 'manual' | 'scale';
export type LotStatus = 'received' | 'waiting' | 'pressing' | 'pressed' | 'withdrawn';

export interface IWeighing {
  id: string;
  kind: WeighingKind;
  grossKg: number | null;
  containers: Record<ContainerKind, number>;
  netKg: number;
  source: WeighingSource;
  recordedAt: string;
  recordedBy: string;
  isPendingSync: boolean;
}

export interface ILot {
  id: string;
  code: string;
  siteId: string;
  clientId: string;
  clientName: string;
  mode: ReceptionMode;
  variety: string;
  status: LotStatus;
  netKg: number;
  announcedContainers: number | null;
  plate: string;
  origin: string;
  quality: string[];
  note: string;
  dailyPricePerKg: number | null;
  weighings: IWeighing[];
  receivedAt: string;
  receivedBy: string;
  finishedAt: string | null;
  isPendingSync: boolean;
}

export interface ISiteReceptionSettings {
  containerTareKg: Record<ContainerKind, number>;
  dailyPricePerKg: number | null;
}

export interface IOpenReceptionPayload {
  id: string;
  siteId: string;
  clientId: string;
  mode: ReceptionMode;
  variety: string;
  announcedContainers: number | null;
  plate: string;
  origin: string;
  quality: string[];
  note: string;
  receivedBy: string;
}

export interface IWeighingDraft {
  kind: WeighingKind;
  grossKg: number | null;
  netKgTyped: number | null;
  containers: Record<ContainerKind, number>;
  source: WeighingSource;
}

export interface IAddWeighingPayload {
  id: string;
  kind: WeighingKind;
  grossKg: number | null;
  containers: Record<ContainerKind, number>;
  netKg: number;
  source: WeighingSource;
  recordedBy: string;
}

export interface IReceptionService {
  getLots(siteId: string): Promise<ILot[]>;
  getSettings(siteId: string): Promise<ISiteReceptionSettings>;
  openReception(payload: IOpenReceptionPayload): Promise<ILot>;
  addWeighing(lotId: string, payload: IAddWeighingPayload): Promise<ILot>;
  finishReception(lotId: string): Promise<ILot>;
  readScale(siteId: string): Promise<number>;
}

export interface IReceptionStore {
  lots: ILot[];
  settings: ISiteReceptionSettings | null;
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
