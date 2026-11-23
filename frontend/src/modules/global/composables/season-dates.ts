import { ref, type Ref } from 'vue';

import { readStorage, writeStorage } from 'global/composables/storage';
import { shiftDate, todayIso } from 'global/composables/date';
import type { IPeriodRange } from 'global/types/period';

/** What the periods « Saison » and « Saison passée » cover: from each Season's first day until the next one starts. */
export interface ISeasonDates {
  currentFrom: string;
  previous: IPeriodRange;
}

const STORAGE_KEY = 'oleoziza.seasonDates.v1';

/** Before any Season is known: the harvest starts on 1 November. */
export const calendarSeasonDates = (today: string): ISeasonDates => {
  const year = Number(today.slice(0, 4)) - (today.slice(5) >= '11-01' ? 0 : 1);
  return { currentFrom: `${year}-11-01`, previous: { from: `${year - 1}-11-01`, to: `${year}-10-31` } };
};

export const seasonDates: Ref<ISeasonDates> = ref(readStorage<ISeasonDates | null>(STORAGE_KEY, null) ?? calendarSeasonDates(todayIso()));

/** The dates of the last Seasons started, from their own first days; kept on the device for the next start. */
export const keepSeasonDates = (startedOn: readonly string[], today: string = todayIso()): void => {
  const starts = [...startedOn].sort().reverse();
  const fallback = calendarSeasonDates(today);
  const currentFrom = starts[0] ?? fallback.currentFrom;
  const before = shiftDate(currentFrom, -1);
  seasonDates.value = { currentFrom, previous: { from: starts[1] ?? `${Number(currentFrom.slice(0, 4)) - 1}${currentFrom.slice(4)}`, to: before } };
  writeStorage(STORAGE_KEY, seasonDates.value);
};
