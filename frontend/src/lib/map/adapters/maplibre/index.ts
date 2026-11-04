// imports
import type { IMapEngine } from '../../types/engine';
import { EMPTY_STATE, type IMapLibreEngineOptions } from './types';

// engine
/**
 * The MapLibre GL adapter. MapLibre itself loads on the first mount, so a session that never
 * shows a map never downloads it. Only `mount`, `destroy` and `getState` can run before that:
 * the controller holds every other call until the engine reports ready.
 */
export const createMapLibreEngine = (options: IMapLibreEngineOptions = {}): IMapEngine => {
  // variables
  let engine: IMapEngine | null = null;
  let mountCount = 0;

  // api
  return {
    mount: (container, mountOptions, callbacks) => {
      const current = ++mountCount;
      import('./loaded-engine')
        .then(({ createLoadedEngine }) => {
          if (current !== mountCount) return;
          engine ??= createLoadedEngine(options);
          engine.mount(container, mountOptions, callbacks);
        })
        .catch((error: unknown) => callbacks.onError({ code: 'unknown', message: error instanceof Error ? error.message : String(error) }));
    },
    destroy: () => {
      mountCount += 1;
      engine?.destroy();
    },
    getState: () => engine?.getState() ?? EMPTY_STATE,
    setBasemap: (basemap) => engine?.setBasemap(basemap),
    addLayer: (layer) => engine?.addLayer(layer),
    setLayerData: (id, data) => engine?.setLayerData(id, data),
    setLayerSymbols: (id, symbols) => engine?.setLayerSymbols(id, symbols),
    setLayerVisible: (id, isVisible) => engine?.setLayerVisible(id, isVisible),
    removeLayer: (id) => engine?.removeLayer(id),
    addMarker: (id, element, markerOptions) => engine?.addMarker(id, element, markerOptions),
    setMarkerLngLat: (id, lngLat) => engine?.setMarkerLngLat(id, lngLat),
    removeMarker: (id) => engine?.removeMarker(id),
    fitBounds: (bounds, fitOptions) => engine?.fitBounds(bounds, fitOptions),
    easeTo: (cameraOptions) => engine?.easeTo(cameraOptions),
    flyTo: (cameraOptions) => engine?.flyTo(cameraOptions),
    jumpTo: (cameraOptions) => engine?.jumpTo(cameraOptions),
    setInsets: (insets, isAnimated) => engine?.setInsets(insets, isAnimated),
    setLimits: (limits) => engine?.setLimits(limits),
  };
};

export type { ILabelFont, IMapLibreEngineOptions } from './types';
