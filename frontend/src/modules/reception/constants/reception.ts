import type { NotificationChoice } from 'lot/types/lot';

export const OLIVE_VARIETIES: readonly { slug: string; name: string }[] = [
  { slug: 'picholine-marocaine', name: 'Picholine marocaine' },
  { slug: 'haouzia', name: 'Haouzia' },
  { slug: 'menara', name: 'Menara' },
  { slug: 'arbequina', name: 'Arbequina' },
  { slug: 'picual', name: 'Picual' },
  { slug: 'autre', name: 'Autre' },
];

export const RECEPTION_MAX_KG = 99_999.9;

export const ORIGIN_SUGGESTIONS: readonly string[] = [
  'Oujda-Angad',
  'Ahfir',
  'Berkane',
  'Taourirt',
  'Jerada',
  'Bni Drar',
  'Naïma',
  'Madagh',
  'Aklim',
];

export const NOTIFICATION_CHOICES: readonly NotificationChoice[] = ['sms', 'email', 'none'];
