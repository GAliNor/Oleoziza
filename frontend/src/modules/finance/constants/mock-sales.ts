import { MOCK_PERIOD_FACTORS } from 'global/constants/period';
import { mockSiteShare } from 'site/constants/mock-sites';
import type { IPaymentMethodShare, ISales, ISalesBar, ISalesFigures } from 'finance/types/finance';
import type { PeriodKey } from 'global/types/period';

const SALES_SEASON: ISalesFigures = { revenue: 371200, collected: 289400, pending: 23850, outstanding: 57950, pendingCount: 7 };

const PAYMENT_METHODS_SEASON: IPaymentMethodShare[] = [
  { key: 'cash', amount: 154300 },
  { key: 'cheque', amount: 61800 },
  { key: 'transfer', amount: 58700 },
  { key: 'oil', amount: 14600 },
];

const DAILY_SALES = [
  { label: 'mer.', revenue: 14200, collected: 11800 },
  { label: 'jeu.', revenue: 18900, collected: 12400 },
  { label: 'ven.', revenue: 9600, collected: 9100 },
  { label: 'sam.', revenue: 22300, collected: 15700 },
  { label: 'dim.', revenue: 6100, collected: 6100 },
  { label: 'lun.', revenue: 16800, collected: 10200 },
  { label: 'auj.', revenue: 12400, collected: 4300 },
];

const WEEKLY_SALES = [
  { label: 'S1', revenue: 38400, collected: 33100 },
  { label: 'S2', revenue: 52700, collected: 46900 },
  { label: 'S3', revenue: 68900, collected: 58200 },
  { label: 'S4', revenue: 79300, collected: 64800 },
  { label: 'S5', revenue: 70200, collected: 52300 },
  { label: 'S6', revenue: 61700, collected: 34100 },
];

const figuresAt = (factor: number): ISalesFigures => {
  const revenue = SALES_SEASON.revenue * factor;
  const span = Math.min(factor, 1);
  const pending = revenue * (SALES_SEASON.pending / SALES_SEASON.revenue + 0.12 * (1 - span));
  const outstanding = revenue * (SALES_SEASON.outstanding / SALES_SEASON.revenue) * (0.6 + 0.4 * span);
  return {
    revenue,
    collected: revenue - pending - outstanding,
    pending,
    outstanding,
    pendingCount: Math.max(1, Math.round(SALES_SEASON.pendingCount * Math.min(factor * 4, 1))),
  };
};

const barsAt = (period: PeriodKey, scale: number): { chartTitleKey: string; bars: ISalesBar[] } => {
  if (period === 'today' || period === 'week') {
    return {
      chartTitleKey: 'finance.sales.chart.days',
      bars: DAILY_SALES.map((day, index) => ({ label: day.label, revenue: day.revenue * scale, collected: day.collected * scale, isCurrent: index === DAILY_SALES.length - 1 })),
    };
  }
  const weeks = period === 'month' ? WEEKLY_SALES.slice(-4) : WEEKLY_SALES;
  const factor = period === 'previous' ? 1.48 * scale : scale;
  return {
    chartTitleKey: period === 'month' ? 'finance.sales.chart.monthWeeks' : 'finance.sales.chart.seasonWeeks',
    bars: weeks.map((week, index) => ({ label: week.label, revenue: week.revenue * factor, collected: week.collected * factor, isCurrent: period !== 'previous' && index === weeks.length - 1 })),
  };
};

export const salesMock = (siteId: string, period: PeriodKey): ISales => {
  const scale = mockSiteShare(siteId);
  const methodTotal = PAYMENT_METHODS_SEASON.reduce((sum, method) => sum + method.amount, 0);
  const figures = figuresAt(scale * MOCK_PERIOD_FACTORS[period]);
  return {
    figures,
    ...barsAt(period, scale),
    methods: PAYMENT_METHODS_SEASON.map((method) => ({ key: method.key, amount: (method.amount / methodTotal) * figures.collected })),
  };
};
