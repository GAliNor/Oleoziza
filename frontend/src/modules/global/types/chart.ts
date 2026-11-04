export interface IChartSeries {
  key: string;
  label?: string;
  colorClass: string;
  hoverClass?: string;
  currentClass?: string;
}

export interface IChartBar {
  label: string;
  values: Record<string, number>;
  isCurrent?: boolean;
}
