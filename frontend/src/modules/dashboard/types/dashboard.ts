import type { PeriodKey } from 'global/types/period';
import type { ISales } from 'finance/types/finance';
import type { IExpenseSummary } from 'expense/types/expense';

export interface ITank {
  id: string;
  siteId: string;
  name: string;
  capacityLitres: number;
  fillLitres: number;
  variety: string | null;
}

export interface ISiteFigures {
  siteId: string;
  name: string;
  oliveKgToday: number;
  oilLitresToday: number;
  queue: number;
  yieldPerQuintal: number;
  revenueSeason: number;
  outstanding: number;
}

export interface IVarietyFigures {
  variety: string;
  lots: number;
  olivesKg: number;
  oilLitres: number;
}

/** One Press Line's work in a period: the Lots whose Pressing ended in it. */
export interface IPressLineFigures {
  pressLineId: string;
  siteId: string;
  name: string;
  lots: number;
  olivesKg: number;
  oilLitres: number;
  pressingHours: number;
}

export interface IOliveBar {
  label: string;
  oliveKg: number;
  oilLitres: number;
  isCurrent: boolean;
}

/** What the Management Home shows for one Site and period. Provisional until the data models settle. */
export interface IDashboard {
  production: { oliveKg: number; oilLitres: number; receptions: number; yieldPerQuintal: number };
  season: {
    oliveKg: number;
    oilLitres: number;
    yieldPerQuintal: number;
    averageWaitHours: number;
    lotsPressed: number;
    oliveDeltaPct: number;
    oilDeltaPct: number;
    yieldDeltaPct: number;
    waitDeltaPct: number;
  };
  modeSplit: { serviceKg: number; purchaseKg: number };
  varieties: IVarietyFigures[];
  pressLines: IPressLineFigures[];
  oliveChart: { titleKey: string; bars: IOliveBar[] };
  tanks: ITank[];
  sites: ISiteFigures[];
  /** Sent with the Dashboard to those who see the finances, so the Finances tab needs no request of its own. */
  sales?: ISales;
  expenseSummary?: IExpenseSummary;
}

export interface IDashboardService {
  getDashboard(siteId: string, period: PeriodKey): Promise<IDashboard>;
}

export interface IDashboardStore {
  dashboard: IDashboard | null;
  isLoading: boolean;
  hasError: boolean;
}
