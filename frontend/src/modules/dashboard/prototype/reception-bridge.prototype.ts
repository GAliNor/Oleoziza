// PROTOTYPE — maps the real reception store's Lots onto the Home prototype's Lot cards until the Home is rebuilt for real.
import { formatTime } from 'reception/composables/format';
import type { ILot } from 'reception/types/reception';
import type { ILotPrototype, ITimelineStep } from 'dashboard/prototype/mock-home.prototype';

const MODE_LABELS = { service: 'Trituration à façon', purchase: 'Achat' };

export const toPrototypeLot = (lot: ILot, currentOperator: string): ILotPrototype => {
  const steps: ITimelineStep[] = [
    {
      kind: 'reception',
      label: 'Réception',
      detail: `${lot.variety} · ${MODE_LABELS[lot.mode]}`,
      at: formatTime(lot.receivedAt),
      by: lot.receivedBy,
      isPendingSync: lot.isPendingSync,
    },
    ...lot.weighings.map(
      (weighing, index): ITimelineStep => ({
        kind: 'weighing',
        label: `Pesée ${index + 1}`,
        detail: `${weighing.netKg.toLocaleString('fr-FR')} kg net · ${weighing.source === 'scale' ? 'bascule' : 'saisie'}`,
        at: formatTime(weighing.recordedAt),
        by: weighing.recordedBy,
        isPendingSync: weighing.isPendingSync,
      }),
    ),
  ];
  if (lot.finishedAt) steps.push({ kind: 'waiting', label: 'En attente', detail: 'File de pressage', at: formatTime(lot.finishedAt), by: lot.receivedBy });
  const operators = [lot.receivedBy, ...lot.weighings.map((weighing) => weighing.recordedBy)];
  return {
    id: lot.code,
    code: lot.code,
    siteId: lot.siteId,
    client: lot.clientName,
    variety: lot.variety,
    mode: lot.mode,
    status: lot.status,
    netKg: lot.netKg,
    oilKg: null,
    receivedAt: formatTime(lot.receivedAt),
    operator: lot.receivedBy,
    isMine: operators.includes(currentOperator),
    isPendingSync: lot.isPendingSync || lot.weighings.some((weighing) => weighing.isPendingSync),
    steps,
  };
};
