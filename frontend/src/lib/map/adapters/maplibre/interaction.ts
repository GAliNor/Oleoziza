// imports
import type { Map as MapLibreMap, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';

import type { IEngineCallbacks } from '../../types/engine';
import type { IMapPointerEvent } from '../../types/events';
import type { Geometry, IFeature } from '../../types/geo';
import { engineLayerIdsOn, layerIdOf, sourceIdOf } from './symbols';
import type { IHovered, IInteraction, ILayerEntry } from './types';

// types
interface IInteractionContext {
  getMap: () => MapLibreMap | null;
  getCallbacks: () => IEngineCallbacks | null;
  entries: Map<string, ILayerEntry>;
}

// helpers
const pointerEventOf = (event: MapMouseEvent): IMapPointerEvent => ({
  lngLat: [event.lngLat.lng, event.lngLat.lat],
  point: [event.point.x, event.point.y],
});

const findOriginal = (entry: ILayerEntry, renderedId: MapGeoJSONFeature['id']): IFeature | undefined => {
  const { features } = entry.layer.data;
  const property = entry.layer.featureIdProperty;
  switch (entry.idMode) {
    case 'promoted':
      return property ? features.find((feature) => feature.properties[property] === renderedId) : undefined;
    case 'own':
      return features.find((feature) => feature.id === renderedId);
    case 'generated':
      return features[Number(renderedId)];
  }
};

/** The caller's feature behind a rendered one, or a copy of the rendered one if it can't be matched. */
const findFeature = (entry: ILayerEntry, rendered: MapGeoJSONFeature): IFeature =>
  findOriginal(entry, rendered.id) ?? {
    type: 'Feature',
    id: rendered.id,
    properties: rendered.properties ?? {},
    geometry: rendered.geometry as unknown as Geometry,
  };

// interaction
/** Hover state, cursor and click/hover callbacks for the interactive layers. */
export const createInteraction = ({ getMap, getCallbacks, entries }: IInteractionContext): IInteraction => {
  // variables
  let hovered: IHovered | null = null;

  // methods
  const setCursor = (cursor: string): void => {
    const map = getMap();
    if (map) map.getCanvas().style.cursor = cursor;
  };

  const interactiveLayerIds = (map: MapLibreMap): string[] => {
    const ids: string[] = [];
    entries.forEach((entry) => {
      if (entry.layer.onClick || entry.layer.onHover) ids.push(...engineLayerIdsOn(map, entry.layer.id));
    });
    return ids;
  };

  /** The top interactive feature under the pointer, with the layer it belongs to. */
  const topFeatureAt = (event: MapMouseEvent): { entry: ILayerEntry; rendered: MapGeoJSONFeature } | null => {
    const map = getMap();
    if (!map) return null;
    const layers = interactiveLayerIds(map);
    if (!layers.length) return null;
    const rendered = map.queryRenderedFeatures(event.point, { layers })[0];
    const layerId = rendered ? layerIdOf(rendered.layer.id) : null;
    const entry = layerId ? entries.get(layerId) : undefined;
    return rendered && entry ? { entry, rendered } : null;
  };

  const setHoverState = (target: IHovered, isHovered: boolean): void => {
    const map = getMap();
    const source = sourceIdOf(target.layerId);
    if (!map?.getSource(source)) return;
    map.setFeatureState({ source, id: target.featureId }, { hover: isHovered });
  };

  const clearHover = (event: IMapPointerEvent): void => {
    if (!hovered) return;
    const previous = hovered;
    hovered = null;
    setHoverState(previous, false);
    entries.get(previous.layerId)?.layer.onHover?.(null, event);
  };

  // event handlers
  const handleMouseMove = (event: MapMouseEvent): void => {
    if (!getMap()) return;
    const top = topFeatureAt(event);
    setCursor(top ? 'pointer' : '');
    const featureId = top?.rendered.id;
    if (hovered && top && hovered.layerId === top.entry.layer.id && hovered.featureId === featureId) return;
    const pointer = pointerEventOf(event);
    clearHover(pointer);
    if (!top || featureId === undefined) return;
    hovered = { layerId: top.entry.layer.id, featureId };
    setHoverState(hovered, true);
    top.entry.layer.onHover?.(findFeature(top.entry, top.rendered), pointer);
  };

  const handleMouseOut = (event: MapMouseEvent): void => {
    setCursor('');
    clearHover(pointerEventOf(event));
  };

  const handleClick = (event: MapMouseEvent): void => {
    const pointer = pointerEventOf(event);
    const top = topFeatureAt(event);
    top?.entry.layer.onClick?.(findFeature(top.entry, top.rendered), pointer);
    getCallbacks()?.onClick(pointer);
  };

  // api
  return {
    handleMouseMove,
    handleMouseOut,
    handleClick,
    reset: () => {
      hovered = null;
    },
    forgetLayer: (layerId) => {
      if (hovered?.layerId !== layerId) return;
      hovered = null;
      setCursor('');
    },
  };
};
