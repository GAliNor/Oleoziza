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

/** A status a Lot reached, with who moved it and when. Provisional until the Operations data model settles. */
export interface ILotMoveRecord {
  status: LotStatus;
  at: string;
  by: string;
}

export interface ILotStep {
  key: string;
  label: string;
  detail: string;
  at: string;
  by: string;
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
  oilKg: number | null;
  tankName: string | null;
  withdrawnKg: number;
  announcedContainers: number | null;
  plate: string;
  origin: string;
  quality: string[];
  note: string;
  dailyPricePerKg: number | null;
  weighings: IWeighing[];
  moves: ILotMoveRecord[];
  receivedAt: string;
  receivedBy: string;
  finishedAt: string | null;
  isPendingSync: boolean;
}

/** One step of a Lot along its statuses; `id` is minted once per user intent, so a retry never moves it twice. */
export interface ILotMove {
  id: string;
  oilKg?: number;
}

export interface ILotMovePayload extends ILotMove {
  by: string;
}

export interface ILotService {
  getLots(siteId: string): Promise<ILot[]>;
  moveLot(lotId: string, move: ILotMovePayload): Promise<ILot>;
}

export interface ILotStore {
  lots: ILot[];
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
