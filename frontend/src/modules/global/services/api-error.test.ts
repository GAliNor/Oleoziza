import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { ApiRefusal, readApiErrorCode } from 'global/services/api-error';

const answered = (status: number, data: unknown): AxiosError =>
  new AxiosError('failed', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data });

describe('readApiErrorCode', () => {
  it('reads the code the backend answers', () => {
    expect(readApiErrorCode(answered(409, { code: 'tank_in_use' }))).toBe('tank_in_use');
  });

  it('reads the code a mock refuses with', () => {
    expect(readApiErrorCode(new ApiRefusal('season_closed'))).toBe('season_closed');
  });

  it('calls a call that got no answer a network failure', () => {
    expect(readApiErrorCode(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe('network');
  });

  it('has no code for an answer without one or for a programming error', () => {
    expect(readApiErrorCode(answered(500, '<html>'))).toBeNull();
    expect(readApiErrorCode(new TypeError('x is undefined'))).toBeNull();
  });
});
