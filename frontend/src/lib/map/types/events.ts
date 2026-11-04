// imports
import type { IFeature, LngLat, PixelPoint } from './geo';
import type { IMapState } from './state';

// pointer
export interface IMapPointerEvent {
  lngLat: LngLat;
  /** Position relative to the map container, in CSS pixels. */
  point: PixelPoint;
}

export type FeatureClickHandler = (feature: IFeature, event: IMapPointerEvent) => void;

/** Called with the feature under the pointer, then with `null` when the pointer leaves the layer. */
export type FeatureHoverHandler = (feature: IFeature | null, event: IMapPointerEvent) => void;

// map events
export interface IMapError {
  /** `webgl-unsupported` when the device cannot draw the map at all. */
  code: 'webgl-unsupported' | 'tile' | 'unknown';
  message: string;
}

export interface IMapEventMap {
  ready: IMapState;
  click: IMapPointerEvent;
  moveend: IMapState;
  zoomend: IMapState;
  error: IMapError;
}

export type MapEventType = keyof IMapEventMap;

export type MapEventHandler<K extends MapEventType> = (payload: IMapEventMap[K]) => void;

export type Unsubscribe = () => void;
