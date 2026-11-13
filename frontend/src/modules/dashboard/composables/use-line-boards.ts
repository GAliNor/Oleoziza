import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClientStore } from 'client/stores/client';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import { formatDateTime, formatTime, toIsoDate, todayIso } from 'global/composables/date';
import { isLate, lineQueue } from 'lot/composables/press-schedule';
import { formatBoxes } from 'lot/composables/lot-boxes';
import type { AvatarVariant } from 'global/types/avatar';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

/** One Lot shown on a Press Line card: the one pressing now, or the next one waiting. */
export interface ILineSlot {
  lot: ILot;
  kind: 'now' | 'next';
  detail: string;
  avatarVariant: AvatarVariant;
  isLate: boolean;
  canMove: boolean;
}

/** One Press Line's now and next, or the Lots still waiting for a Press Line (`line` null). */
export interface ILineBoard {
  key: string;
  line: IPressLineSetting | null;
  slots: ILineSlot[];
  laterCount: number;
}

const UNPLANNED_BOARD_KEY = 'unplanned';

/** A time today, a date and time otherwise. */
export const plannedLabel = (at: string): string => (toIsoDate(at) === todayIso() ? formatTime(at) : formatDateTime(at));

/** Per Press Line, the Lot pressing now and the next one waiting, plus a board for Lots with no Press Line yet. */
export const useLineBoards = (lots: () => readonly ILot[], pressLines: ComputedRef<IPressLineSetting[]>): ComputedRef<ILineBoard[]> => {
  // stores
  const { t } = useI18n();
  const clientStore = useClientStore();

  // methods
  const avatarVariantOf = (lot: ILot): AvatarVariant => clientAvatarVariant(clientStore.clientById(lot.clientId)?.kind ?? 'individual');

  const startedAt = (lot: ILot): string | undefined => [...lot.moves].reverse().find((record) => record.status === 'pressing')?.at;

  const slotDetail = (lot: ILot): string => {
    const started = lot.status === 'pressing' ? startedAt(lot) : undefined;
    const when = started
      ? t('dashboard.operator.line.since', { at: plannedLabel(started) })
      : lot.plannedStartAt
        ? t('dashboard.operator.stage.planned', { at: plannedLabel(lot.plannedStartAt) })
        : '';
    return [lot.code, when, lot.boxNumbers.length ? formatBoxes(lot.boxNumbers) : ''].filter(Boolean).join(' · ');
  };

  const toSlot = (lot: ILot, kind: ILineSlot['kind'], canMove: boolean): ILineSlot => ({
    lot,
    kind,
    detail: slotDetail(lot),
    avatarVariant: avatarVariantOf(lot),
    isLate: isLate(lot, new Date()),
    canMove,
  });

  const toBoard = (key: string, line: IPressLineSetting | null, queue: ILot[]): ILineBoard => {
    const now = queue.find((lot) => lot.status === 'pressing');
    const waiting = queue.filter((lot) => lot.status === 'waiting');
    const slots = [...(now ? [toSlot(now, 'now', true)] : []), ...(waiting[0] ? [toSlot(waiting[0], 'next', !now && !!line)] : [])];
    return { key, line, slots, laterCount: Math.max(waiting.length - 1, 0) };
  };

  // computed
  return computed((): ILineBoard[] => {
    const all = lots();
    const boards = pressLines.value.map((line) => toBoard(line.id, line, lineQueue(all, line.id)));
    const unplanned = all
      .filter((lot) => !lot.pressLineId && (lot.status === 'waiting' || lot.status === 'pressing'))
      .sort((first, second) => first.receivedAt.localeCompare(second.receivedAt));
    return unplanned.length ? [...boards, toBoard(UNPLANNED_BOARD_KEY, null, unplanned)] : boards;
  });
};
