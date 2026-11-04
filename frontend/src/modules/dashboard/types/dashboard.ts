import type { PeriodKey } from 'global/types/period';

export interface ITank {
  id: string;
  siteId: string;
  name: string;
  capacityKg: number;
  fillKg: number;
  variety: string;
  isBio: boolean;
}

export interface ITankStorage {
  tankId: string;
  lotCode: string;
  client: string;
  kind: 'client' | 'mill';
  kg: number;
  startDay: number;
  endDay: number | null;
}

export interface ISiteFigures {
  siteId: string;
  name: string;
  oliveKgToday: number;
  oilKgToday: number;
  queue: number;
  yieldPct: number;
  revenueSeason: number;
  outstanding: number;
}

export interface IVarietyFigures {
  variety: string;
  lots: number;
  olivesKg: number;
  oilKg: number;
}

export interface IOliveBar {
  label: string;
  oliveKg: number;
  oilKg: number;
  isCurrent: boolean;
}

/** What the Management Home shows for one Site and period. Provisional until the data models settle. */
export interface IDashboard {
  production: { oliveKg: number; oilKg: number; receptions: number; yieldPct: number };
  season: {
    oliveKg: number;
    oilKg: number;
    yieldPct: number;
    averageWaitHours: number;
    lotsPressed: number;
    oliveDeltaPct: number;
    oilDeltaPct: number;
    yieldDeltaPct: number;
    waitDeltaPct: number;
  };
  modeSplit: { serviceKg: number; purchaseKg: number };
  varieties: IVarietyFigures[];
  oliveChart: { titleKey: string; bars: IOliveBar[] };
  tanks: ITank[];
  tankStorage: ITankStorage[];
  sites: ISiteFigures[];
}

export interface IDashboardService {
  getDashboard(siteId: string, period: PeriodKey): Promise<IDashboard>;
}

export interface IDashboardStore {
  dashboard: IDashboard | null;
  isLoading: boolean;
  hasError: boolean;
}
