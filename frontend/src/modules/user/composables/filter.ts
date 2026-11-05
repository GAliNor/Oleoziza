import type { IStaffUser, UserFilter } from 'user/types/user';

export const matchesFilter = (user: IStaffUser, key: UserFilter): boolean => {
  if (key === 'management' || key === 'operator' || key === 'accountant') return user.role === key && user.status !== 'disabled';
  if (key === 'invited' || key === 'disabled') return user.status === key;
  return user.status !== 'disabled';
};
