// imports
import type { Map as MapLibreMap } from 'maplibre-gl';

import type { IBasemap } from '../../types/basemap';

// constants
const BASEMAP_PREFIX = 'basemap::';
const BACKGROUND_ID = `${BASEMAP_PREFIX}background`;
const DEFAULT_TILE_SIZE = 256;

// basemap
/** Replaces the basemap layers, keeping them under every overlay. */
export const setBasemapLayers = (map: MapLibreMap, basemap: IBasemap): void => {
  const current = map.getLayersOrder().filter((id) => id.startsWith(BASEMAP_PREFIX));
  current.forEach((id) => map.removeLayer(id));
  current.forEach((id) => map.getSource(id) && map.removeSource(id));
  const beforeId = map.getLayersOrder()[0];
  if (basemap.background) {
    map.addLayer({ id: BACKGROUND_ID, type: 'background', paint: { 'background-color': basemap.background } }, beforeId);
  }
  basemap.layers.forEach((layer, index) => {
    const id = `${BASEMAP_PREFIX}${basemap.id}::${index}`;
    map.addSource(id, {
      type: 'raster',
      tiles: [layer.tiles],
      tileSize: layer.tileSize ?? DEFAULT_TILE_SIZE,
      ...(layer.maxZoom !== undefined ? { maxzoom: layer.maxZoom } : {}),
      ...(layer.attribution ? { attribution: layer.attribution } : {}),
    });
    map.addLayer({ id, type: 'raster', source: id, ...(layer.minZoom ? { minzoom: layer.minZoom } : {}) }, beforeId);
  });
};
