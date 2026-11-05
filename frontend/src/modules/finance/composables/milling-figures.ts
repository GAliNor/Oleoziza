import { shiftDate, toIsoDate } from 'global/composables/date';
import { periodRange } from 'global/composables/use-period';
import { amountDue, millingFee } from 'lot/composables/fee';
import type { ILot } from 'lot/types/lot';
import type { IMovement, IPaymentMethodShare, ISales, ISalesBar, ISalesFigures, PaymentMethodKey } from 'finance/types/finance';
import type { PeriodKey } from 'global/types/period';

const METHODS: PaymentMethodKey[] = ['cash', 'cheque', 'transfer', 'oil'];

interface IBucket {
  label: string;
  from: string;
  to: string;
}

const inRange = (day: string, from: string, to: string): boolean => day >= from && day <= to;

/**
 * The four figures over the Lots received in the period, so they always add up: CA = Encaissé + À confirmer + Reste à encaisser.
 * A fee counts at its Reception, at full price while a Discount waits; a Credit Note taken off a Lot counts as collected.
 */
export const millingFigures = (lots: readonly ILot[], movements: readonly IMovement[], from: string, to: string): ISalesFigures => {
  const cohort = lots.filter((lot) => inRange(toIsoDate(lot.receivedAt), from, to));
  const ids = new Set(cohort.map((lot) => lot.id));
  const revenue = cohort.reduce((sum, lot) => sum + millingFee(lot), 0);
  const outstanding = cohort.reduce((sum, lot) => sum + amountDue(lot), 0);
  const pending = cohort.reduce((sum, lot) => sum + Math.min(lot.pendingDh, millingFee(lot) - lot.paidDh - lot.creditDh), 0);
  const pendingCount = movements.filter((movement) => movement.status === 'pending' && movement.lotLinks.some((link) => ids.has(link.lotId))).length;
  return { revenue, collected: revenue - pending - outstanding, pending, outstanding, pendingCount };
};

const weekBuckets = (from: string, to: string, prefix: string): IBucket[] => {
  const buckets: IBucket[] = [];
  for (let start = from, index = 1; start <= to; start = shiftDate(start, 7), index += 1) {
    const end = shiftDate(start, 6);
    buckets.push({ label: `${prefix}${index}`, from: start, to: end < to ? end : to });
  }
  return buckets;
};

const bucketsOf = (period: PeriodKey, today: string, dayLabel: (isoDate: string) => string, weekPrefix: string): { titleKey: string; buckets: IBucket[] } => {
  if (period === 'today' || period === 'week') {
    const days = Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 6));
    return { titleKey: 'finance.sales.chart.days', buckets: days.map((day) => ({ label: dayLabel(day), from: day, to: day })) };
  }
  const { from, to } = periodRange(period, today);
  return { titleKey: period === 'month' ? 'finance.sales.chart.monthWeeks' : 'finance.sales.chart.seasonWeeks', buckets: weekBuckets(from, to, weekPrefix) };
};

/** Fees billed and money confirmed, bucket by bucket: CA at the Reception date, Encaissé at the confirmation date. */
const barsOf = (lots: readonly ILot[], movements: readonly IMovement[], buckets: IBucket[], today: string): ISalesBar[] =>
  buckets.map((bucket) => ({
    label: bucket.label,
    revenue: lots.filter((lot) => inRange(toIsoDate(lot.receivedAt), bucket.from, bucket.to)).reduce((sum, lot) => sum + millingFee(lot), 0),
    collected: movements
      .filter((movement) => movement.status === 'confirmed' && movement.decidedAt && inRange(toIsoDate(movement.decidedAt), bucket.from, bucket.to))
      .reduce((sum, movement) => sum + movement.lotLinks.reduce((total, link) => total + link.amount, 0), 0),
    isCurrent: inRange(today, bucket.from, bucket.to),
  }));

/** How the confirmed Payments of the period's Lots were made. */
const methodsOf = (lots: readonly ILot[], movements: readonly IMovement[]): IPaymentMethodShare[] => {
  const ids = new Set(lots.map((lot) => lot.id));
  return METHODS.map((key) => ({
    key,
    amount: movements
      .filter((movement) => movement.status === 'confirmed' && movement.method === key)
      .flatMap((movement) => movement.lotLinks)
      .filter((link) => ids.has(link.lotId))
      .reduce((sum, link) => sum + link.amount, 0),
  }));
};

export const millingSales = (lots: readonly ILot[], movements: readonly IMovement[], period: PeriodKey, today: string, dayLabel: (isoDate: string) => string, weekPrefix: string): ISales => {
  const { from, to } = periodRange(period, today);
  const { titleKey, buckets } = bucketsOf(period, today, dayLabel, weekPrefix);
  return {
    figures: millingFigures(lots, movements, from, to),
    chartTitleKey: titleKey,
    bars: barsOf(lots, movements, buckets, today),
    methods: methodsOf(lots.filter((lot) => inRange(toIsoDate(lot.receivedAt), from, to)), movements),
  };
};
