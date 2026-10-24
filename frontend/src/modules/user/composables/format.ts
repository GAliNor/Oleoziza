import type { IStaffUser } from 'user/types/user';

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatFullName = (user: Pick<IStaffUser, 'firstName' | 'lastName'>): string => `${user.firstName} ${user.lastName}`;

export const formatInitials = (user: Pick<IStaffUser, 'firstName' | 'lastName'>): string => `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
