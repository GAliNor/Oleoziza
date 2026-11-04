// imports
import type { MapMouseEvent } from 'maplibre-gl';

import type { IEngineLayer } from '../../types/engine';
import type { IMapState } from '../../types/state';

// constants
export const EMPTY_STATE: IMapState = { isReady: false, center: [0, 0], zoom: 1, bearing: 0, pitch: 0, bounds: null };

// options
export interface ILabelFont {
  /** Glyphs URL template with `{fontstack}` and `{range}`. */
  url: string;
  /** Font stack names the glyphs server serves. */
  font: string[];
}

export interface IMapLibreEngineOptions {
  /** Needed for `label` symbols. Without it, labels are skipped. */
  labelFont?: ILabelFont;
}

// layers
export type FeatureIdMode = 'promoted' | 'own' | 'generated';

export interface ILayerEntry {
  layer: IEngineLayer;
  order: number;
  idMode: FeatureIdMode;
}

// interaction
export interface IHovered {
  layerId: string;
  featureId: string | number;
}

export interface IInteraction {
  handleMouseMove: (event: MapMouseEvent) => void;
  handleMouseOut: (event: MapMouseEvent) => void;
  handleClick: (event: MapMouseEvent) => void;
  /** Forgets the hovered feature without notifying, e.g. after a style reload. */
  reset: () => void;
  /** Forgets the hovered feature if it belongs to `layerId`, before that layer is removed. */
  forgetLayer: (layerId: string) => void;
}
