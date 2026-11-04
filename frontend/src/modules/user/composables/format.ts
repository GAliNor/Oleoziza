import type { IStaffUser } from 'user/types/user';

export const formatFullName = (user: Pick<IStaffUser, 'firstName' | 'lastName'>): string => `${user.firstName} ${user.lastName}`;
