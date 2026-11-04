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

export interface ILotService {
  getLots(siteId: string): Promise<ILot[]>;
}

export interface ILotStore {
  lots: ILot[];
}
