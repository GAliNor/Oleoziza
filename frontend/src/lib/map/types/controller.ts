// imports
import type { IBasemap } from './basemap';
import type { ICamera, ICameraLimits, ICameraOptions, IInsets } from './camera';
import type { IMapEngine } from './engine';
import type { MapEventHandler, MapEventType, Unsubscribe } from './events';
import type { ILayers } from './layer';
import type { IMarkers } from './marker';
import type { IMapState } from './state';

// controller
/**
 * The map, as the app sees it. Every call is safe at any time: the controller keeps the desired
 * state and applies it once the engine is ready, and again after each engine restart.
 */
export interface IMapController {
  readonly camera: ICamera;
  readonly layers: ILayers;
  readonly markers: IMarkers;
  setBasemap(basemap: IBasemap): void;
  getState(): IMapState;
  /** Resolves on the first ready. Already ready resolves at once. */
  whenReady(): Promise<void>;
  on<K extends MapEventType>(type: K, handler: MapEventHandler<K>): Unsubscribe;
}

// plugin
export interface IMapPluginOptions {
  engine: IMapEngine;
  initialView?: Pick<ICameraOptions, 'center' | 'zoom' | 'bearing' | 'pitch'>;
  limits?: ICameraLimits;
  insets?: Partial<IInsets>;
  basemap?: IBasemap;
  /** Default true. False makes a static figure: no pan, zoom or page-scroll capture. */
  isInteractive?: boolean;
  /** Credit for data the host draws, shown with the map's own. */
  attribution?: string;
}
