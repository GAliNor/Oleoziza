import type { ContainerKind, ReceptionMode } from 'reception/types/reception';

export const RECEPTION_MODES: readonly ReceptionMode[] = ['service', 'purchase'];

export const CONTAINER_KINDS: readonly ContainerKind[] = ['sac', 'caisse'];

export const VARIETIES: readonly string[] = ['Picholine marocaine', 'Haouzia', 'Menara', 'Arbequina', 'Picual', 'Autre'];

export const QUALITY_TAGS: readonly string[] = ['clean', 'leaves', 'bruised', 'fallen', 'fermented'];

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

export const WEIGHT_MAX_DIGITS = 6;

export const SCALE_READ_DELAY_MS = 900;
