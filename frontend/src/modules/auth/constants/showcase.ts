export const SHOWCASE_OIL_KG = 12480;
export const SHOWCASE_OIL_L = 13565;
export const SHOWCASE_GROWTH_PERCENT = 8.2;
export const SHOWCASE_YIELD_PERCENT = 18.4;

export const SHOWCASE_MONTHLY_OIL = [
  { monthKey: 'oct', kg: 1850 },
  { monthKey: 'nov', kg: 3920 },
  { monthKey: 'dec', kg: 4310 },
  { monthKey: 'jan', kg: 2400 },
] as const;

export const SHOWCASE_ACTIVITY = [
  { initials: 'HZ', titleKey: 'lotPressed', detailKey: 'lotPressedDetail', timeKey: 'minutesAgo', minutes: 5 },
  { initials: 'DE', titleKey: 'paymentConfirmed', detailKey: 'paymentConfirmedDetail', timeKey: 'minutesAgo', minutes: 18 },
] as const;
