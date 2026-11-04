// imports
import type { AddLayerObject, Map as MapLibreMap } from 'maplibre-gl';

import type { IEngineLayer } from '../../types/engine';
import type { IMatchRule, IStepRule, ISymbols, StyleValue } from '../../types/style';
import type { ILabelFont } from './types';

// types
export type SymbolKind = keyof ISymbols;

// constants
export const SYMBOL_ORDER: SymbolKind[] = ['fill', 'line', 'circle', 'icon', 'label'];
const OVERLAY_PREFIX = 'overlay::';

// ids
export const sourceIdOf = (layerId: string): string => `${OVERLAY_PREFIX}${layerId}`;

export const engineLayerIdOf = (layerId: string, kind: SymbolKind): string => `${OVERLAY_PREFIX}${layerId}::${kind}`;

/** The library layer id behind an engine layer id, or `null` for a layer the library did not add. */
export const layerIdOf = (engineLayerId: string): string | null =>
  engineLayerId.startsWith(OVERLAY_PREFIX)
    ? engineLayerId.slice(OVERLAY_PREFIX.length, engineLayerId.lastIndexOf('::'))
    : null;

/** The engine layers of a library layer that exist on `map`, bottom first. */
export const engineLayerIdsOn = (map: MapLibreMap, layerId: string): string[] =>
  SYMBOL_ORDER.map((kind) => engineLayerIdOf(layerId, kind)).filter((id) => map.getLayer(id));

// style values
const isMatchRule = <T>(value: StyleValue<T>): value is IMatchRule<T> =>
  typeof value === 'object' && value !== null && 'match' in value && 'byProperty' in value;

const isStepRule = <T>(value: StyleValue<T>): value is IStepRule<T> =>
  typeof value === 'object' && value !== null && 'steps' in value && 'byProperty' in value;

/** Turns a constant or rule into a MapLibre expression. */
export const toExpression = <T>(value: StyleValue<T>): unknown => {
  if (isMatchRule(value)) {
    const pairs = Object.entries(value.match).flatMap(([key, output]) => [key, output]);
    if (!pairs.length) return value.default;
    return ['match', ['to-string', ['get', value.byProperty]], ...pairs, value.default];
  }
  if (isStepRule(value)) {
    const steps = [...value.steps].sort(([a], [b]) => a - b).flat();
    if (!steps.length) return value.base;
    return ['step', ['to-number', ['get', value.byProperty], 0], value.base, ...steps];
  }
  return value;
};

/** Every output a value can take, e.g. the image URLs an icon needs. */
export const valuesOf = <T>(value: StyleValue<T>): T[] => {
  if (isMatchRule(value)) return [...Object.values(value.match), value.default];
  if (isStepRule(value)) return [value.base, ...value.steps.map(([, output]) => output)];
  return [value];
};

const withHover = (base: unknown, hover: unknown): unknown =>
  hover === undefined ? base : ['case', ['boolean', ['feature-state', 'hover'], false], hover, base];

const defined = (entries: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined));

// layers
/** The MapLibre layers that draw one library layer, bottom first. */
export const buildEngineLayers = (layer: IEngineLayer, labelFont: ILabelFont | null): AddLayerObject[] => {
  const { symbols } = layer;
  const source = sourceIdOf(layer.id);
  const common = (kind: SymbolKind): Record<string, unknown> =>
    defined({ id: engineLayerIdOf(layer.id, kind), source, minzoom: layer.minZoom, maxzoom: layer.maxZoom });
  const visibility = layer.isVisible ? 'visible' : 'none';
  const result: Record<string, unknown>[] = [];

  if (symbols.fill) {
    const { color, opacity = 1, hover = {} } = symbols.fill;
    result.push({
      ...common('fill'),
      type: 'fill',
      layout: { visibility },
      paint: {
        'fill-color': withHover(toExpression(color), hover.color),
        'fill-opacity': withHover(toExpression(opacity), hover.opacity),
      },
    });
  }

  if (symbols.line) {
    const { color, width, opacity = 1, dash, hover = {} } = symbols.line;
    result.push({
      ...common('line'),
      type: 'line',
      layout: { visibility, 'line-join': 'round', 'line-cap': 'round' },
      paint: defined({
        'line-color': withHover(toExpression(color), hover.color),
        'line-width': withHover(toExpression(width), hover.width),
        'line-opacity': withHover(toExpression(opacity), hover.opacity),
        'line-dasharray': dash,
      }),
    });
  }

  if (symbols.circle) {
    const { color, radius, opacity = 1, strokeColor = '#ffffff', strokeWidth = 0, hover = {} } = symbols.circle;
    result.push({
      ...common('circle'),
      type: 'circle',
      layout: { visibility },
      paint: {
        'circle-color': withHover(toExpression(color), hover.color),
        'circle-radius': withHover(toExpression(radius), hover.radius),
        'circle-opacity': withHover(toExpression(opacity), hover.opacity),
        'circle-stroke-color': withHover(toExpression(strokeColor), hover.strokeColor),
        'circle-stroke-width': withHover(toExpression(strokeWidth), hover.strokeWidth),
      },
    });
  }

  if (symbols.icon) {
    const { image, size = 1, anchor = 'center', rotate = 0, allowOverlap = false } = symbols.icon;
    result.push({
      ...common('icon'),
      type: 'symbol',
      layout: {
        visibility,
        'icon-image': toExpression(image),
        'icon-size': toExpression(size),
        'icon-anchor': anchor,
        'icon-rotate': toExpression(rotate),
        'icon-allow-overlap': allowOverlap,
      },
    });
  }

  if (symbols.label && labelFont) {
    const { textProperty, size = 12, color = '#1f2937', haloColor = '#ffffff', haloWidth = 1, anchor = 'center' } =
      symbols.label;
    result.push({
      ...common('label'),
      type: 'symbol',
      layout: {
        visibility,
        'text-field': ['to-string', ['get', textProperty]],
        'text-font': labelFont.font,
        'text-size': toExpression(size),
        'text-anchor': anchor,
        'text-allow-overlap': symbols.label.allowOverlap ?? false,
      },
      paint: {
        'text-color': toExpression(color),
        'text-halo-color': haloColor,
        'text-halo-width': haloWidth,
        'text-translate': symbols.label.offset ?? [0, 0],
      },
    });
  }

  return result as unknown as AddLayerObject[];
};
