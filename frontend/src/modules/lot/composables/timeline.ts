import { i18n } from '~/plugins/i18n';

import { formatKg, formatLitres, formatOilKg, formatQuintals, formatYield } from 'lot/composables/quantity';
import type { ILot, ILotStep, LotStatus, LotStepKey } from 'lot/types/lot';

const t = (key: string, values: Record<string, string> = {}): string => i18n.global.t(`lot.timeline.${key}`, values);

const moveDetail = (lot: ILot, status: LotStatus): string => {
  if (status === 'waiting') return t('waitingDetail');
  if (status === 'pressing') return t('pressingDetail');
  if (status === 'pressed') return lot.oilKg ? `${formatOilKg(lot.oilKg)} · ${t('yield', { value: formatYield(lot.oilKg, lot.netKg) })}` : '';
  return `${formatLitres(lot.withdrawnKg)} · ${t('withdrawnContainers')}`;
};

/** A Lot's journey, from its Reception through every move it has made. Any step may carry a photo. */
export const buildLotTimeline = (lot: ILot): ILotStep[] => {
  const imageOf = (key: LotStepKey): string | null => lot.stepPhotos[key] ?? null;
  const steps: ILotStep[] = [
    { key: 'reception', label: t('reception'), detail: `${lot.clientName} · ${lot.variety}`, at: lot.receivedAt, by: lot.receivedBy, imageUrl: imageOf('reception') },
    { key: 'weighing', label: t('weighing'), detail: t('weighingDetail', { net: formatKg(lot.netKg), quintals: formatQuintals(lot.netKg) }), at: lot.receivedAt, by: lot.receivedBy, imageUrl: imageOf('weighing') },
  ];
  lot.moves.forEach((move) => {
    steps.push({ key: move.status, label: t(move.status), detail: moveDetail(lot, move.status), at: move.at, by: move.by, imageUrl: imageOf(move.status) });
    if (move.status === 'pressed' && lot.tankName) steps.push({ key: 'stored', label: t('stored'), detail: lot.tankName, at: move.at, by: move.by, imageUrl: imageOf('stored') });
  });
  return steps;
};
