// imports
import {
  GPUInitializationError,
  Map as MapLibreMap,
  Marker,
  type GeoJSONSource,
  type MapEventType,
} from 'maplibre-gl';

import type { IBasemap } from '../../types/basemap';
import type { ICameraOptions } from '../../types/camera';
import type { IEngineCallbacks, IEngineLayer, IMapEngine } from '../../types/engine';
import type { IFeatureCollection } from '../../types/geo';
import type { IMapState } from '../../types/state';
import type { IIconSymbol } from '../../types/style';
import { setBasemapLayers } from './basemap';
import { createInteraction } from './interaction';
import { buildEngineLayers, engineLayerIdsOn, sourceIdOf, valuesOf } from './symbols';
import { EMPTY_STATE, type FeatureIdMode, type ILayerEntry, type IMapLibreEngineOptions } from './types';

// types
type GeoJSONData = Parameters<GeoJSONSource['setData']>[0];

// constants
const INSET_DURATION_MS = 300;

// helpers
const definedCamera = (options: ICameraOptions | Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));

/** Our GeoJSON types and MapLibre's describe the same data; this is the one place they are bridged. */
const toGeoJSON = (data: IFeatureCollection): GeoJSONData => data as unknown as GeoJSONData;

const idModeOf = (layer: IEngineLayer): FeatureIdMode => {
  if (layer.featureIdProperty) return 'promoted';
  return layer.data.features.every((feature) => feature.id !== undefined) ? 'own' : 'generated';
};

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  await image.decode();
  return image;
};

// engine
/** One engine serves one `<MapView>` at a time. */
export const createLoadedEngine = (options: IMapLibreEngineOptions = {}): IMapEngine => {
  // variables
  const labelFont = options.labelFont ?? null;
  const entries = new Map<string, ILayerEntry>();
  const markers = new Map<string, Marker>();
  const loadingImages = new Set<string>();
  let map: MapLibreMap | null = null;
  let callbacks: IEngineCallbacks | null = null;
  let isReady = false;
  let order = 0;
  let hasWarnedLabels = false;
  const interaction = createInteraction({ getMap: () => map, getCallbacks: () => callbacks, entries });

  // methods
  const getState = (): IMapState => {
    if (!map) return EMPTY_STATE;
    const center = map.getCenter();
    const bounds = map.getBounds();
    return {
      isReady,
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      bounds: [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()],
      ],
    };
  };

  /** The first engine layer drawn above `entry`, so it can be inserted before it. */
  const beforeIdOf = (entry: ILayerEntry): string | undefined => {
    let next: ILayerEntry | null = null;
    for (const other of entries.values()) {
      if (other === entry) continue;
      const isAbove =
        other.layer.zIndex > entry.layer.zIndex ||
        (other.layer.zIndex === entry.layer.zIndex && other.order > entry.order);
      const isCloser =
        !next ||
        other.layer.zIndex < next.layer.zIndex ||
        (other.layer.zIndex === next.layer.zIndex && other.order < next.order);
      if (isAbove && isCloser) next = other;
    }
    return next && map ? engineLayerIdsOn(map, next.layer.id)[0] : undefined;
  };

  const loadIcons = (icon: IIconSymbol | undefined): void => {
    if (!icon || !map) return;
    for (const url of valuesOf(icon.image)) {
      if (!url || map.hasImage(url) || loadingImages.has(url)) continue;
      loadingImages.add(url);
      loadImage(url)
        .then((image) => {
          if (map && !map.hasImage(url)) map.addImage(url, image);
        })
        .catch(() => callbacks?.onError({ code: 'unknown', message: `map: icon "${url}" failed to load` }))
        .finally(() => loadingImages.delete(url));
    }
  };

  const addEngineLayers = (entry: ILayerEntry): void => {
    if (!map) return;
    if (entry.layer.symbols.label && !labelFont && !hasWarnedLabels) {
      hasWarnedLabels = true;
      console.warn('map: label symbols need `labelFont` in createMapLibreEngine(); labels are skipped');
    }
    loadIcons(entry.layer.symbols.icon);
    const beforeId = beforeIdOf(entry);
    for (const engineLayer of buildEngineLayers(entry.layer, labelFont)) map.addLayer(engineLayer, beforeId);
  };

  const removeEngineLayers = (layerId: string): void => {
    if (!map) return;
    for (const id of engineLayerIdsOn(map, layerId)) map.removeLayer(id);
  };

  // event handlers
  const handleStyleLoad = (): void => {
    entries.clear();
    interaction.reset();
    isReady = true;
    callbacks?.onReady();
  };

  const handleMoveEnd = (): void => {
    callbacks?.onMoveEnd(getState());
  };

  const handleZoomEnd = (): void => {
    callbacks?.onZoomEnd(getState());
  };

  const handleError = (event: MapEventType['error']): void => {
    const isTile = 'sourceId' in event && Boolean(event.sourceId);
    callbacks?.onError({ code: isTile ? 'tile' : 'unknown', message: event.error?.message ?? 'map error' });
  };

  // api
  return {
    mount: (container, mountOptions, engineCallbacks) => {
      callbacks = engineCallbacks;
      const { view, limits, insets, isInteractive, attribution } = mountOptions;
      try {
        map = new MapLibreMap({
          container,
          style: { version: 8, sources: {}, layers: [], ...(labelFont ? { glyphs: labelFont.url } : {}) },
          ...(definedCamera({
            center: view.center,
            zoom: view.zoom,
            bearing: view.bearing,
            pitch: view.pitch,
            maxBounds: limits.maxBounds ?? undefined,
            minZoom: limits.minZoom,
            maxZoom: limits.maxZoom,
          }) as object),
          interactive: isInteractive,
          attributionControl: { compact: true, ...(attribution ? { customAttribution: attribution } : {}) },
        });
      } catch (error) {
        map = null;
        engineCallbacks.onError({
          code: error instanceof GPUInitializationError ? 'webgl-unsupported' : 'unknown',
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      map.setPadding(insets);
      map.on('style.load', handleStyleLoad);
      map.on('moveend', handleMoveEnd);
      map.on('zoomend', handleZoomEnd);
      map.on('click', interaction.handleClick);
      map.on('mousemove', interaction.handleMouseMove);
      map.on('mouseout', interaction.handleMouseOut);
      map.on('error', handleError);
    },

    destroy: () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      entries.clear();
      map?.remove();
      map = null;
      callbacks = null;
      isReady = false;
      interaction.reset();
    },

    getState,

    setBasemap: (basemap: IBasemap) => {
      if (map) setBasemapLayers(map, basemap);
    },

    addLayer: (layer) => {
      if (!map || entries.has(layer.id)) return;
      const entry: ILayerEntry = { layer, order: ++order, idMode: idModeOf(layer) };
      entries.set(layer.id, entry);
      map.addSource(sourceIdOf(layer.id), {
        type: 'geojson',
        data: toGeoJSON(layer.data),
        ...(entry.idMode === 'promoted' && layer.featureIdProperty ? { promoteId: layer.featureIdProperty } : {}),
        ...(entry.idMode === 'generated' ? { generateId: true } : {}),
      });
      addEngineLayers(entry);
    },

    setLayerData: (id, data: IFeatureCollection) => {
      const entry = entries.get(id);
      if (!entry || !map) return;
      entry.layer = { ...entry.layer, data };
      map.getSource<GeoJSONSource>(sourceIdOf(id))?.setData(toGeoJSON(data));
    },

    setLayerSymbols: (id, symbols) => {
      const entry = entries.get(id);
      if (!entry || !map) return;
      entry.layer = { ...entry.layer, symbols };
      removeEngineLayers(id);
      addEngineLayers(entry);
    },

    setLayerVisible: (id, isVisible) => {
      const entry = entries.get(id);
      if (!entry || !map) return;
      entry.layer = { ...entry.layer, isVisible };
      const visibility = isVisible ? 'visible' : 'none';
      for (const engineId of engineLayerIdsOn(map, id)) map.setLayoutProperty(engineId, 'visibility', visibility);
    },

    removeLayer: (id) => {
      if (!entries.has(id) || !map) return;
      interaction.forgetLayer(id);
      removeEngineLayers(id);
      if (map.getSource(sourceIdOf(id))) map.removeSource(sourceIdOf(id));
      entries.delete(id);
    },

    addMarker: (id, element, markerOptions) => {
      if (!map || markers.has(id)) return;
      const marker = new Marker({ element, anchor: markerOptions.anchor ?? 'center', offset: markerOptions.offset })
        .setLngLat(markerOptions.lngLat)
        .addTo(map);
      markers.set(id, marker);
    },

    setMarkerLngLat: (id, lngLat) => {
      markers.get(id)?.setLngLat(lngLat);
    },

    removeMarker: (id) => {
      markers.get(id)?.remove();
      markers.delete(id);
    },

    fitBounds: (bounds, fitOptions) => {
      map?.fitBounds(bounds, definedCamera({ maxZoom: fitOptions.maxZoom, duration: fitOptions.duration }));
    },
    easeTo: (cameraOptions) => {
      map?.easeTo(definedCamera(cameraOptions));
    },
    flyTo: (cameraOptions) => {
      map?.flyTo(definedCamera(cameraOptions));
    },
    jumpTo: (cameraOptions) => {
      const { duration: _duration, ...rest } = cameraOptions;
      map?.jumpTo(definedCamera(rest));
    },
    setInsets: (insets, isAnimated) => {
      if (isAnimated) map?.easeTo({ padding: insets, duration: INSET_DURATION_MS });
      else map?.setPadding(insets);
    },
    setLimits: (limits) => {
      if (!map) return;
      if (limits.maxBounds !== undefined) map.setMaxBounds(limits.maxBounds);
      if (limits.minZoom !== undefined) map.setMinZoom(limits.minZoom);
      if (limits.maxZoom !== undefined) map.setMaxZoom(limits.maxZoom);
    },
  };
};
