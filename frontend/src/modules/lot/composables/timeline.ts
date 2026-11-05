import { i18n } from '~/plugins/i18n';

import { formatBoxes } from 'lot/composables/lot-boxes';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatLitres, formatOil, formatQuintals, formatYield } from 'lot/composables/quantity';
import type { ILot, ILotDiscount, ILotNotification, ILotStep, LotStatus, LotStepKey } from 'lot/types/lot';

const t = (key: string, values: Record<string, string> = {}): string => i18n.global.t(`lot.timeline.${key}`, values);

const moveDetail = (lot: ILot, status: LotStatus): string => {
  if (status === 'waiting') return lot.boxNumbers.length ? `${t('waitingDetail')} · ${formatBoxes(lot.boxNumbers)}` : t('waitingDetail');
  if (status === 'pressing') return t('pressingDetail');
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
export const buildLotTimeline = (lot: ILot): ILotStep[] => {
  const imageOf = (key: LotStepKey): string | null => lot.stepPhotos[key] ?? null;
  const steps: ILotStep[] = [
    { key: 'reception', label: t('reception'), detail: `${lot.clientName} · ${lot.variety} · ${t('receptionWeight', { net: formatKg(lot.netKg), quintals: formatQuintals(lot.netKg) })}`, at: lot.receivedAt, by: lot.receivedBy, imageUrl: imageOf('reception') },
  ];
  if (lot.discount) steps.push({ key: 'discount', label: t('discount'), detail: discountDetail(lot.discount), at: lot.discount.givenAt, by: lot.discount.givenBy, imageUrl: null });
  lot.moves.forEach((move) => {
    steps.push({ key: move.status, label: t(move.status), detail: moveDetail(lot, move.status), at: move.at, by: move.by, imageUrl: imageOf(move.status) });
    if (move.status === 'pressed' && lot.tankName) steps.push({ key: 'stored', label: t('stored'), detail: lot.tankName, at: move.at, by: move.by, imageUrl: imageOf('stored') });
    if (move.status === 'pressed') lot.notifications.filter((item) => item.event === 'pressed').forEach((item) => steps.push(notificationStep(lot, item)));
  });
  if (lot.discount?.decidedAt) steps.push(decisionStep(lot.discount));
  lot.notifications.filter((item) => item.event !== 'pressed').forEach((item) => steps.push(notificationStep(lot, item)));
  return steps;
};
