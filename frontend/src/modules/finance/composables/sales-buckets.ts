import { formatWeekday } from 'global/composables/date';
import { i18n } from '~/plugins/i18n';
import type { IPaymentMethodShare, ISales, ISalesFigures } from 'finance/types/finance';

export interface ISalesBucket {
  startsOn: string;
  endsOn: string;
  revenue: number;
  collected: number;
  isCurrent: boolean;
}

/** The sales as the backend computes them: buckets the front labels. */
export interface ISalesAnswer {
  figures: ISalesFigures;
  chartTitleKey: string;
  buckets: ISalesBucket[];
  methods: IPaymentMethodShare[];
}

/** A bar's label: its weekday for the last 7 days, « S1 », « S2 »… for weeks. */
export const labelBucket = (startsOn: string, index: number, isDaily: boolean): string => (isDaily ? formatWeekday(startsOn) : `${i18n.global.t('finance.sales.weekPrefix')}${index + 1}`);

export const toSales = (answer: ISalesAnswer): ISales => {
  const isDaily = answer.chartTitleKey.endsWith('.days');
  return {
    figures: answer.figures,
    chartTitleKey: answer.chartTitleKey,
    methods: answer.methods,
    bars: answer.buckets.map((bucket, index) => ({ label: labelBucket(bucket.startsOn, index, isDaily), revenue: bucket.revenue, collected: bucket.collected, isCurrent: bucket.isCurrent })),
  };
};
