import type { Bounds } from 'map';

import type { IProvince } from 'client/types/client';

/** The whole Oriental Region, framed the same way for every Client so the map reads as "where in the Region". */
export const ORIENTAL_BOUNDS: Bounds = [
  [-4.11, 31.71],
  [-1, 35.4],
];

/** Boundaries in oriental-provinces.json: geoBoundaries gbOpen MAR ADM2, from OpenStreetMap (ODbL), simplified with mapshaper. */
export const ORIENTAL_PROVINCES: IProvince[] = [
  { id: 'oujda-angad', name: 'Oujda-Angad', kind: 'prefecture', labelAt: [-1.72, 34.72] },
  { id: 'nador', name: 'Nador', kind: 'province', labelAt: [-2.98, 35.12] },
  { id: 'berkane', name: 'Berkane', kind: 'province', labelAt: [-2.6, 34.92] },
  { id: 'taourirt', name: 'Taourirt', kind: 'province', labelAt: [-2.92, 33.95] },
  { id: 'jerada', name: 'Jerada', kind: 'province', labelAt: [-2.12, 34.08] },
  { id: 'driouch', name: 'Driouch', kind: 'province', labelAt: [-3.5, 34.93] },
  { id: 'guercif', name: 'Guercif', kind: 'province', labelAt: [-3.62, 34.12] },
  { id: 'figuig', name: 'Figuig', kind: 'province', labelAt: [-2.5, 32.75] },
];
