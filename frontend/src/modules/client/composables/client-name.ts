import type { ICreateClientPayload } from 'client/types/client';

/** The name shown before the server answers, built like the backend's: first and last name, or the legal name. */
export const buildClientName = (payload: Pick<ICreateClientPayload, 'kind' | 'firstName' | 'lastName' | 'legalName'>): string =>
  payload.kind === 'company' ? (payload.legalName ?? '') : [payload.firstName, payload.lastName].filter(Boolean).join(' ');
