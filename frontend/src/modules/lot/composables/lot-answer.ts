import type { ILot, LotStepKey } from 'lot/types/lot';

/** A Lot as the backend answers it: which steps have a photo, under the backend's names. */
export type LotAnswer = Omit<ILot, 'stepPhotos' | 'photoSteps'> & { photoSteps: string[] };

const STEP_BY_PHOTO_STEP: Record<string, LotStepKey> = { reception: 'reception', pressing_started: 'pressing', pressed: 'pressed', stored: 'stored', withdrawal: 'withdrawn' };

export const toLot = (answer: LotAnswer): ILot => ({ ...answer, stepPhotos: {}, photoSteps: (answer.photoSteps ?? []).map((step) => STEP_BY_PHOTO_STEP[step]).filter(Boolean) });

export const toStepPhotos = (urls: Record<string, string>): ILot['stepPhotos'] => Object.fromEntries(Object.entries(urls).map(([step, url]) => [STEP_BY_PHOTO_STEP[step] ?? step, url]));
