import type { ContainerKind, ILot, ReceptionMode, WeighingKind, WeighingSource } from 'lot/types/lot';

export interface ISiteReceptionSettings {
  containerTareKg: Record<ContainerKind, number>;
  dailyPricePerKg: number | null;
  boxCount: number;
  boxCapacityKg: number;
}

export interface IOpenReceptionPayload {
  id: string;
  siteId: string;
  clientId: string;
  mode: ReceptionMode;
  variety: string;
  boxNumbers: number[];
  photoUrl?: string;
  receivedBy: string;
}

export interface IWeighingDraft {
  id: string;
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
  getSettings(siteId: string): Promise<ISiteReceptionSettings>;
  openReception(payload: IOpenReceptionPayload): Promise<ILot>;
  addWeighing(lotId: string, payload: IAddWeighingPayload): Promise<ILot>;
  finishReception(lotId: string): Promise<ILot>;
  readScale(siteId: string): Promise<number>;
}

export interface IReceptionStore {
  settings: ISiteReceptionSettings | null;
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
