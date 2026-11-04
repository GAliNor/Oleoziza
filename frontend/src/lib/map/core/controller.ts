// imports
import type { IBasemap } from '../types/basemap';
import type { ICamera, ICameraLimits, ICameraOptions, IInsets } from '../types/camera';
import type { IMapController, IMapPluginOptions } from '../types/controller';
import type { IEngineCallbacks, IEngineLayer, IMapEngine } from '../types/engine';
import type { IMapEventMap, MapEventType, Unsubscribe } from '../types/events';
import type { ILayerDefinition, ILayerHandle, ILayers } from '../types/layer';
import type { IMarkerHandle, IMarkerOptions, IMarkers } from '../types/marker';
import type { IMapState } from '../types/state';

// types
/** The controller plus what only the library's own Vue layer calls. */
export interface IMapControllerInternal extends IMapController {
  mount(container: HTMLElement): void;
  unmount(): void;
  onStateChange(listener: (state: IMapState) => void): Unsubscribe;
}

interface IMarkerEntry {
  element: HTMLElement;
  options: IMarkerOptions;
}

// constants
const DEFAULT_VIEW: ICameraOptions = { center: [0, 0], zoom: 1, bearing: 0, pitch: 0 };
const NO_INSETS: IInsets = { top: 0, right: 0, bottom: 0, left: 0 };

// controller
/**
 * Keeps the desired map (basemap, layers, markers, camera settings) and applies it to the engine
 * whenever the engine is ready, so callers never wait on the engine.
 */
export const createMapController = (options: IMapPluginOptions): IMapControllerInternal => {
  // variables
  const engine: IMapEngine = options.engine;
  const view: ICameraOptions = { ...DEFAULT_VIEW, ...options.initialView };
  let limits: ICameraLimits = { ...options.limits };
  let insets: IInsets = { ...NO_INSETS, ...options.insets };
  let basemap: IBasemap | null = options.basemap ?? null;
  const layers = new Map<string, IEngineLayer>();
  const layerHandles = new Map<string, ILayerHandle>();
  const markers = new Map<string, IMarkerEntry>();
  const handlers = new Map<MapEventType, Set<(payload: unknown) => void>>();
  const stateListeners = new Set<(state: IMapState) => void>();
  let pendingCamera: (() => void) | null = null;
  let isMounted = false;
  let isReady = false;
  let hasMarkersApplied = false;
  let layerCount = 0;
  let markerCount = 0;
  let state: IMapState = {
    isReady: false,
    center: view.center ?? [0, 0],
    zoom: view.zoom ?? 1,
    bearing: view.bearing ?? 0,
    pitch: view.pitch ?? 0,
    bounds: null,
  };
  let resolveReady: () => void = () => undefined;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  // methods
  const emit = <K extends MapEventType>(type: K, payload: IMapEventMap[K]): void => {
    handlers.get(type)?.forEach((handler) => handler(payload));
  };

  const setState = (next: IMapState): void => {
    state = next;
    stateListeners.forEach((listener) => listener(state));
  };

  const applyMarker = (id: string, entry: IMarkerEntry): void => {
    engine.addMarker(id, entry.element, entry.options);
  };

  const applyAll = (): void => {
    engine.setLimits(limits);
    engine.setInsets(insets, false);
    if (basemap) engine.setBasemap(basemap);
    layers.forEach((layer) => engine.addLayer(layer));
    if (!hasMarkersApplied) {
      markers.forEach((entry, id) => applyMarker(id, entry));
      hasMarkersApplied = true;
    }
    pendingCamera?.();
    pendingCamera = null;
  };

  const runCamera = (command: () => void): void => {
    if (isReady) command();
    else pendingCamera = command;
  };

  const callbacks: IEngineCallbacks = {
    onReady: () => {
      isReady = true;
      applyAll();
      setState(engine.getState());
      resolveReady();
      emit('ready', state);
    },
    onMoveEnd: (next) => {
      setState(next);
      emit('moveend', state);
    },
    onZoomEnd: (next) => {
      setState(next);
      emit('zoomend', state);
    },
    onClick: (event) => emit('click', event),
    onError: (error) => {
      if (handlers.get('error')?.size) emit('error', error);
      else console.error(`map: ${error.code}: ${error.message}`);
    },
  };

  const createLayerHandle = (id: string): ILayerHandle => ({
    id,
    setData: (data) => {
      const layer = layers.get(id);
      if (!layer) return;
      layer.data = data;
      if (isReady) engine.setLayerData(id, data);
    },
    setSymbols: (symbols) => {
      const layer = layers.get(id);
      if (!layer) return;
      layer.symbols = symbols;
      if (isReady) engine.setLayerSymbols(id, symbols);
    },
    setVisible: (isVisible) => {
      const layer = layers.get(id);
      if (!layer) return;
      layer.isVisible = isVisible;
      if (isReady) engine.setLayerVisible(id, isVisible);
    },
    remove: () => {
      if (!layers.delete(id)) return;
      layerHandles.delete(id);
      if (isReady) engine.removeLayer(id);
    },
  });

  const addLayer = (definition: ILayerDefinition): ILayerHandle => {
    const id = definition.id ?? `layer-${++layerCount}`;
    if (layers.has(id)) throw new Error(`map: a layer with id "${id}" already exists`);
    const layer: IEngineLayer = {
      ...definition,
      id,
      zIndex: definition.zIndex ?? 0,
      isVisible: definition.isVisible ?? true,
    };
    layers.set(id, layer);
    const handle = createLayerHandle(id);
    layerHandles.set(id, handle);
    if (isReady) engine.addLayer(layer);
    return handle;
  };

  const addMarker = (markerOptions: IMarkerOptions): IMarkerHandle => {
    const id = `marker-${++markerCount}`;
    const element = document.createElement('div');
    const entry: IMarkerEntry = { element, options: { ...markerOptions } };
    element.style.display = markerOptions.isVisible === false ? 'none' : '';
    if (markerOptions.isInteractive) element.style.cursor = 'pointer';
    markers.set(id, entry);
    if (isMounted && hasMarkersApplied) applyMarker(id, entry);
    return {
      element,
      setLngLat: (lngLat) => {
        entry.options.lngLat = lngLat;
        if (isMounted && markers.has(id)) engine.setMarkerLngLat(id, lngLat);
      },
      setVisible: (isVisible) => {
        entry.options.isVisible = isVisible;
        element.style.display = isVisible ? '' : 'none';
      },
      remove: () => {
        if (!markers.delete(id)) return;
        if (isMounted && hasMarkersApplied) engine.removeMarker(id);
        element.remove();
      },
    };
  };

  const camera: ICamera = {
    fitBounds: (bounds, fitOptions = {}) => runCamera(() => engine.fitBounds(bounds, fitOptions)),
    easeTo: (cameraOptions) => runCamera(() => engine.easeTo(cameraOptions)),
    flyTo: (cameraOptions) => runCamera(() => engine.flyTo(cameraOptions)),
    jumpTo: (cameraOptions) => runCamera(() => engine.jumpTo(cameraOptions)),
    setInsets: (next) => {
      insets = { ...insets, ...next };
      if (isReady) engine.setInsets(insets, true);
    },
    getInsets: () => ({ ...insets }),
    setLimits: (next) => {
      limits = { ...limits, ...next };
      if (isReady) engine.setLimits(limits);
    },
  };

  const layersApi: ILayers = {
    add: addLayer,
    get: (id) => layerHandles.get(id),
  };

  const markersApi: IMarkers = { add: addMarker };

  // controller
  return {
    camera,
    layers: layersApi,
    markers: markersApi,
    setBasemap: (next) => {
      basemap = next;
      if (isReady) engine.setBasemap(next);
    },
    getState: () => state,
    whenReady: () => readyPromise,
    on: (type, handler) => {
      const set = handlers.get(type) ?? new Set();
      handlers.set(type, set);
      const listener = handler as (payload: unknown) => void;
      set.add(listener);
      return () => set.delete(listener);
    },
    mount: (container) => {
      if (isMounted) return;
      isMounted = true;
      hasMarkersApplied = false;
      const { center, zoom, bearing, pitch, bounds } = state;
      const mountView: ICameraOptions = bounds ? { center, zoom, bearing, pitch } : view;
      engine.mount(container, { view: mountView, limits, insets, isInteractive: options.isInteractive ?? true, attribution: options.attribution }, callbacks);
    },
    unmount: () => {
      if (!isMounted) return;
      isMounted = false;
      isReady = false;
      hasMarkersApplied = false;
      engine.destroy();
      setState({ ...state, isReady: false });
    },
    onStateChange: (listener) => {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
  };
};
