import type { Bounds } from 'map';

import type { ILocation, IProvince } from 'territory/types/territory';

export const EMPTY_LOCATION: ILocation = { province: null, city: '', address: '' };

/** The whole Oriental Region, framed the same way everywhere so the map reads as "where in the Region". */
export const ORIENTAL_BOUNDS: Bounds = [
  [-4.11, 31.71],
  [-1, 35.4],
];

/** Boundaries in oriental-provinces.json: geoBoundaries gbOpen MAR ADM2, from OpenStreetMap (ODbL), simplified with mapshaper. */
export const ORIENTAL_PROVINCES: IProvince[] = [
  { id: 'oujda-angad', name: 'Oujda-Angad', kind: 'prefecture', labelAt: [-1.42, 34.72], cities: ['Oujda', 'Bni Drar', 'Naïma', 'Aïn Sfa', 'Isly'] },
  { id: 'nador', name: 'Nador', kind: 'province', labelAt: [-2.98, 35.12], cities: ['Nador', 'Beni Ensar', 'Selouane', 'Zeghanghane', 'Al Aaroui'] },
  { id: 'berkane', name: 'Berkane', kind: 'province', labelAt: [-2.6, 34.92], cities: ['Berkane', 'Ahfir', 'Saïdia', 'Aklim', 'Madagh', 'Zegzel'] },
  { id: 'taourirt', name: 'Taourirt', kind: 'province', labelAt: [-2.92, 33.95], cities: ['Taourirt', 'El Aioun Sidi Mellouk', 'Debdou'] },
  { id: 'jerada', name: 'Jerada', kind: 'province', labelAt: [-2.12, 34.08], cities: ['Jerada', 'Aïn Bni Mathar', 'Touissit', 'Sidi Boubker'] },
  { id: 'driouch', name: 'Driouch', kind: 'province', labelAt: [-3.5, 34.93], cities: ['Driouch', 'Midar', 'Ben Taieb'] },
  { id: 'guercif', name: 'Guercif', kind: 'province', labelAt: [-3.62, 34.12], cities: ['Guercif', 'Saka'] },
  { id: 'figuig', name: 'Figuig', kind: 'province', labelAt: [-2.5, 32.75], cities: ['Figuig', 'Bouarfa', 'Bni Tadjite', 'Talsint', 'Tendrara'] },
];
