import type { LngLat } from 'map';

export type ProvinceId = 'oujda-angad' | 'nador' | 'berkane' | 'taourirt' | 'jerada' | 'driouch' | 'guercif' | 'figuig';

type Ring = LngLat[];

/** A Province outline as GeoJSON: simplified geoBoundaries ADM2 (OpenStreetMap, ODbL). */
export type ProvinceBoundary = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };

export interface IProvince {
  id: ProvinceId;
  name: string;
  kind: 'province' | 'prefecture';
  labelAt: LngLat;
  boundary: ProvinceBoundary | null;
  /** The main towns, offered as shortcuts; any other can be typed. */
  cities: readonly string[];
}

/** Where a Client or an Operator lives. */
export interface ILocation {
  province: ProvinceId | null;
  city: string;
  address: string;
}

export interface ITerritoryService {
  getProvinces(): Promise<IProvince[]>;
}

export interface ITerritoryStore {
  provinces: IProvince[];
  isLoading: boolean;
  hasError: boolean;
}
