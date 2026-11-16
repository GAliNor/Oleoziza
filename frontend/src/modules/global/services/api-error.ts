import { isHttpError } from '~/plugins/axios';

export const NETWORK_ERROR_CODE = 'network';

/** A refused business rule raised by a mock service, carrying the same code the backend answers. */
export class ApiRefusal extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ApiRefusal';
  }
}

const readBodyCode = (data: unknown): string | null => {
  if (typeof data !== 'object' || data === null || !('code' in data)) return null;
  const { code } = data as { code: unknown };
  return typeof code === 'string' ? code : null;
};

/** The refusal code of a failed call: the backend's `{ code }`, a mock's ApiRefusal, `network` when no answer came, else null. */
export const readApiErrorCode = (error: unknown): string | null => {
  if (error instanceof ApiRefusal) return error.code;
  if (!isHttpError(error)) return null;
  if (!error.response) return NETWORK_ERROR_CODE;
  return readBodyCode(error.response.data);
};
