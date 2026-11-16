import type { Bounds } from 'map';

import type { ILocation } from 'territory/types/territory';

export const EMPTY_LOCATION: ILocation = { province: null, city: '', address: '' };

/** The whole Oriental Region, framed the same way everywhere so the map reads as "where in the Region". */
export const ORIENTAL_BOUNDS: Bounds = [
  [-4.11, 31.71],
  [-1, 35.4],
];
