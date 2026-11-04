import { APP_LOCALE, APP_TIME_ZONE } from 'global/constants/locale';

const ISO_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE });

const format = (at: string, options: Intl.DateTimeFormatOptions): string => new Date(at).toLocaleString(APP_LOCALE, { timeZone: APP_TIME_ZONE, ...options });

/** The calendar day a timestamp falls on in Morocco, whatever the device's clock says. */
export const toIsoDate = (at: string | Date): string => ISO_DATE_FORMAT.format(new Date(at));

export const todayIso = (): string => toIsoDate(new Date());

export const shiftDate = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Whole calendar days between a timestamp and today, in Morocco time. */
export const daysSince = (at: string): number => Math.round((new Date(todayIso()).getTime() - new Date(toIsoDate(at)).getTime()) / 86_400_000);

export const formatTime = (at: string): string => format(at, { hour: '2-digit', minute: '2-digit' });

export const formatShortDate = (at: string): string => format(at, { day: 'numeric', month: 'short' });

export const formatFullDate = (at: string): string => format(at, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDayDate = (at: string): string => format(at, { weekday: 'short', day: 'numeric', month: 'short' });

export const formatDateTime = (at: string): string => format(at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
