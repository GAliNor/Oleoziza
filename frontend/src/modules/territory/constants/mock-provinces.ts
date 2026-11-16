import type { IProvince } from 'territory/types/territory';

/** Mirror of the backend's reference seed, outlines left out: the mock adds them from mock-province-outlines.json, loaded only in mock mode. */
export const PROVINCES_MOCK: IProvince[] = [
  { id: 'oujda-angad', name: 'Oujda-Angad', kind: 'prefecture', labelAt: [-1.42, 34.72], boundary: null, cities: ['Oujda', 'Bni Drar', 'Naïma', 'Aïn Sfa', 'Isly'] },
  { id: 'nador', name: 'Nador', kind: 'province', labelAt: [-2.98, 35.12], boundary: null, cities: ['Nador', 'Beni Ensar', 'Selouane', 'Zeghanghane', 'Al Aaroui'] },
  { id: 'berkane', name: 'Berkane', kind: 'province', labelAt: [-2.6, 34.92], boundary: null, cities: ['Berkane', 'Ahfir', 'Saïdia', 'Aklim', 'Madagh', 'Zegzel'] },
  { id: 'taourirt', name: 'Taourirt', kind: 'province', labelAt: [-2.92, 33.95], boundary: null, cities: ['Taourirt', 'El Aioun Sidi Mellouk', 'Debdou'] },
  { id: 'jerada', name: 'Jerada', kind: 'province', labelAt: [-2.12, 34.08], boundary: null, cities: ['Jerada', 'Aïn Bni Mathar', 'Touissit', 'Sidi Boubker'] },
  { id: 'driouch', name: 'Driouch', kind: 'province', labelAt: [-3.5, 34.93], boundary: null, cities: ['Driouch', 'Midar', 'Ben Taieb'] },
  { id: 'guercif', name: 'Guercif', kind: 'province', labelAt: [-3.62, 34.12], boundary: null, cities: ['Guercif', 'Saka'] },
  { id: 'figuig', name: 'Figuig', kind: 'province', labelAt: [-2.5, 32.75], boundary: null, cities: ['Figuig', 'Bouarfa', 'Bni Tadjite', 'Talsint', 'Tendrara'] },
];
