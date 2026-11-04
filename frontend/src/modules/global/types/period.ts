export type PeriodKey = 'today' | 'week' | 'month' | 'season' | 'previous';

export interface IPeriod {
  key: PeriodKey;
  label: string;
  noun: string;
  days: number;
}

export interface IPeriodRange {
  from: string;
  to: string;
}
