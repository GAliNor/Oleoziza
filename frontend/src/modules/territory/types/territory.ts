import type { LngLat } from 'map';

export type ProvinceId = 'oujda-angad' | 'nador' | 'berkane' | 'taourirt' | 'jerada' | 'driouch' | 'guercif' | 'figuig';

export interface IProvince {
  id: ProvinceId;
  name: string;
  kind: 'province' | 'prefecture';
  labelAt: LngLat;
  /** The main towns, offered as shortcuts; any other can be typed. */
  cities: readonly string[];
}

/** Where a Client or an Operator lives. */
export interface ILocation {
  province: ProvinceId | null;
  city: string;
  address: string;
}
