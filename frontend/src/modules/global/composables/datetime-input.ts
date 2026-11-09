const pad = (value: number): string => String(value).padStart(2, '0');

/** An instant as a `datetime-local` input shows it, in the device's time. */
export const toDateTimeInput = (at: string): string => {
  const date = new Date(at);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** What a `datetime-local` input holds, back to an instant; empty when nothing valid is typed. */
export const fromDateTimeInput = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};
