import { describe, expect, it } from 'vitest';

import { matchesFilter } from 'user/composables/filter';
import type { IStaffUser } from 'user/types/user';

const user = (role: IStaffUser['role'], status: IStaffUser['status']): IStaffUser => ({ role, status }) as IStaffUser;

describe('matchesFilter', () => {
  it('keeps active and invited users of the Role, never disabled ones', () => {
    expect([
      matchesFilter(user('operator', 'active'), 'operator'),
      matchesFilter(user('operator', 'invited'), 'operator'),
      matchesFilter(user('operator', 'disabled'), 'operator'),
      matchesFilter(user('management', 'active'), 'operator'),
    ]).toEqual([true, true, false, false]);
  });

  it('matches invited and disabled by status', () => {
    expect([matchesFilter(user('operator', 'invited'), 'invited'), matchesFilter(user('management', 'disabled'), 'disabled')]).toEqual([true, true]);
  });

  it('leaves disabled users out of everyone', () => {
    expect([matchesFilter(user('operator', 'active'), 'all'), matchesFilter(user('operator', 'disabled'), 'all')]).toEqual([true, false]);
  });
});
