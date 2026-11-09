import { i18n } from '~/plugins/i18n';

import { formatBoxes } from 'lot/composables/lot-boxes';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatLitres, formatOil, formatQuintals, formatYield } from 'lot/composables/quantity';
import { formatFullDate } from 'global/composables/date';
import type { ILot, ILotDiscount, ILotNotification, ILotStep, ILotStorage, LotStatus, LotStepKey } from 'lot/types/lot';

const t = (key: string, values: Record<string, string> = {}): string => i18n.global.t(`lot.timeline.${key}`, values);

/** Names the timeline can't read from the Lot itself: its Press Line and its Tanks come from the Site's configuration. */
export interface ITimelineContext {
  lineLabel: string | null;
  tankLabel: (tankId: string) => string;
}

const NO_CONTEXT: ITimelineContext = { lineLabel: null, tankLabel: (tankId) => tankId };

const moveDetail = (lot: ILot, status: LotStatus, context: ITimelineContext): string => {
  if (status === 'waiting') return lot.boxNumbers.length ? `${t('waitingDetail')} · ${formatBoxes(lot.boxNumbers)}` : t('waitingDetail');
  if (status === 'pressing') return context.lineLabel ? t('pressingOnLine', { line: context.lineLabel }) : t('pressingDetail');
  if (status === 'pressed') return lot.oilLitres ? `${formatOil(lot.oilLitres)} · ${t('yield', { value: formatYield(lot.oilLitres, lot.netKg) })}` : '';
  return `${formatLitres(lot.withdrawnLitres)} · ${t('withdrawnContainers')}`;
};

const notificationStep = (lot: ILot, notification: ILotNotification): ILotStep => ({
  key: 'notification',
  label: t(notification.isFailed ? 'notificationFailed' : 'notification'),
  detail: t(`notificationEvents.${notification.event}`, { channel: t(`notificationChannels.${notification.channel}`) }),
  at: notification.at,
  by: lot.clientName,
  imageUrl: null,
});

const storageDetail = (storage: ILotStorage, context: ITimelineContext): string => {
  const parts = [context.tankLabel(storage.tankId), formatLitres(storage.litres)];
  if (storage.plannedUntil) parts.push(t('storedUntil', { date: formatFullDate(storage.plannedUntil) }));
  return parts.join(' · ');
};

/** What the Client took at once when pressing ended: the oil not poured into a Tank. */
const handedAtPressing = (lot: ILot): number => Math.max((lot.oilLitres ?? 0) - lot.storages.reduce((sum, storage) => sum + storage.litres, 0), 0);

const discountDetail = (discount: ILotDiscount): string => t(`discountStates.${discount.state}`, { amount: formatMoney(discount.amountDh), percent: String(discount.percent) });

const decisionStep = (discount: ILotDiscount): ILotStep => ({
  key: 'discount',
  label: t(discount.state === 'approved' ? 'discountApproved' : 'discountRefused'),
  detail: discount.refusalReason ?? t('discountApprovedDetail'),
  at: discount.decidedAt ?? '',
  by: discount.decidedBy ?? '',
  imageUrl: null,
});

/** A Lot's journey, from its Reception through every move it has made. Any step may carry a photo. */
export const buildLotTimeline = (lot: ILot, context: ITimelineContext = NO_CONTEXT): ILotStep[] => {
  const imageOf = (key: LotStepKey): string | null => lot.stepPhotos[key] ?? null;
  const steps: ILotStep[] = [
    { key: 'reception', label: t('reception'), detail: `${lot.clientName} · ${lot.variety} · ${t('receptionWeight', { net: formatKg(lot.netKg), quintals: formatQuintals(lot.netKg) })}`, at: lot.receivedAt, by: lot.receivedBy, imageUrl: imageOf('reception') },
  ];
  if (lot.discount) steps.push({ key: 'discount', label: t('discount'), detail: discountDetail(lot.discount), at: lot.discount.givenAt, by: lot.discount.givenBy, imageUrl: null });
  lot.moves.forEach((move) => {
    steps.push({ key: move.status, label: t(move.status), detail: moveDetail(lot, move.status, context), at: move.at, by: move.by, imageUrl: imageOf(move.status) });
    if (move.status === 'pressed') {
      if (lot.storages.length && handedAtPressing(lot) > 0) steps.push({ key: 'withdrawn', label: t('handedOver'), detail: formatLitres(handedAtPressing(lot)), at: move.at, by: move.by, imageUrl: null });
      lot.storages.forEach((storage) => steps.push({ key: 'stored', label: t('stored'), detail: storageDetail(storage, context), at: storage.from, by: storage.by, imageUrl: imageOf('stored') }));
    }
    if (move.status === 'pressed') lot.notifications.filter((item) => item.event === 'pressed').forEach((item) => steps.push(notificationStep(lot, item)));
  });
  if (lot.discount?.decidedAt) steps.push(decisionStep(lot.discount));
  lot.notifications.filter((item) => item.event !== 'pressed').forEach((item) => steps.push(notificationStep(lot, item)));
  return steps;
};
