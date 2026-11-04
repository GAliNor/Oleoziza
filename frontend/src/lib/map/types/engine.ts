// imports
import type { IBasemap } from './basemap';
import type { ICameraLimits, ICameraOptions, IFitBoundsOptions, IInsets } from './camera';
import type { IMapError, IMapPointerEvent, FeatureClickHandler, FeatureHoverHandler } from './events';
import type { Bounds, IFeatureCollection, LngLat } from './geo';
import type { IMarkerOptions } from './marker';
import type { IMapState } from './state';
import type { ISymbols } from './style';

// engine
/** A layer as the controller hands it to the engine: id and defaults resolved. */
export interface IEngineLayer {
  id: string;
  data: IFeatureCollection;
  symbols: ISymbols;
  featureIdProperty?: string;
  zIndex: number;
  isVisible: boolean;
  minZoom?: number;
  maxZoom?: number;
  onClick?: FeatureClickHandler;
  onHover?: FeatureHoverHandler;
}

export interface IEngineCallbacks {
  /** Every time the engine can take the basemap and layers again (first load and each style reload). */
  onReady(): void;
  onMoveEnd(state: IMapState): void;
  onZoomEnd(state: IMapState): void;
  onClick(event: IMapPointerEvent): void;
  onError(error: IMapError): void;
}

export interface IEngineMountOptions {
  view: ICameraOptions;
  limits: ICameraLimits;
  insets: IInsets;
  isInteractive: boolean;
  attribution?: string;
}

/**
 * What an adapter implements (`adapters/<engine>/`). It applies what it is told and keeps no
 * desired state of its own: the controller re-sends everything after each `onReady`.
 */
export interface IMapEngine {
  mount(container: HTMLElement, options: IEngineMountOptions, callbacks: IEngineCallbacks): void;
  destroy(): void;
  getState(): IMapState;

  setBasemap(basemap: IBasemap): void;

  addLayer(layer: IEngineLayer): void;
  setLayerData(id: string, data: IFeatureCollection): void;
  setLayerSymbols(id: string, symbols: ISymbols): void;
  setLayerVisible(id: string, isVisible: boolean): void;
  removeLayer(id: string): void;

  /** Pins an element the controller created. Markers survive `onReady` until `destroy`. */
  addMarker(id: string, element: HTMLElement, options: IMarkerOptions): void;
  setMarkerLngLat(id: string, lngLat: LngLat): void;
  removeMarker(id: string): void;

  fitBounds(bounds: Bounds, options: IFitBoundsOptions): void;
  easeTo(options: ICameraOptions): void;
  flyTo(options: ICameraOptions): void;
  jumpTo(options: ICameraOptions): void;
  /** Animated eases the camera so the visible centre stays put; otherwise the padding changes at once. */
  setInsets(insets: IInsets, isAnimated: boolean): void;
  setLimits(limits: ICameraLimits): void;
}
