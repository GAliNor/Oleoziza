// coordinates
/** A position as `[longitude, latitude]` in degrees. */
export type LngLat = [number, number];

/** A box as `[[west, south], [east, north]]` in degrees. */
export type Bounds = [LngLat, LngLat];

/** A screen offset or point as `[x, y]` in CSS pixels. */
export type PixelPoint = [number, number];

// geometry
export interface IPointGeometry { type: 'Point'; coordinates: LngLat }
export interface IMultiPointGeometry { type: 'MultiPoint'; coordinates: LngLat[] }
export interface ILineStringGeometry { type: 'LineString'; coordinates: LngLat[] }
export interface IMultiLineStringGeometry { type: 'MultiLineString'; coordinates: LngLat[][] }
export interface IPolygonGeometry { type: 'Polygon'; coordinates: LngLat[][] }
export interface IMultiPolygonGeometry { type: 'MultiPolygon'; coordinates: LngLat[][][] }

export type Geometry =
  | IPointGeometry
  | IMultiPointGeometry
  | ILineStringGeometry
  | IMultiLineStringGeometry
  | IPolygonGeometry
  | IMultiPolygonGeometry;

// features
export type FeatureProperties = Record<string, unknown>;

/** A plain GeoJSON feature. Callbacks always receive this shape, never an engine object. */
export interface IFeature<P extends FeatureProperties = FeatureProperties> {
  type: 'Feature';
  id?: string | number;
  properties: P;
  geometry: Geometry;
}

export interface IFeatureCollection<P extends FeatureProperties = FeatureProperties> {
  type: 'FeatureCollection';
  features: IFeature<P>[];
}
