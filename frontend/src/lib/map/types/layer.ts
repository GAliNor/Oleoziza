// imports
import type { FeatureClickHandler, FeatureHoverHandler } from './events';
import type { IFeatureCollection } from './geo';
import type { ISymbols } from './style';

// definition
export interface ILayerDefinition {
  /** Unique among layers. Generated when left out; adding a duplicate throws. */
  id?: string;
  data: IFeatureCollection;
  symbols: ISymbols;
  /** Feature property used as the feature's id for hover. Defaults to `feature.id`. */
  featureIdProperty?: string;
  /** Higher draws on top. Layers with the same value draw in the order they were added. Default 0. */
  zIndex?: number;
  /** Default true. */
  isVisible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Makes the layer interactive: the cursor becomes a pointer over its features. */
  onClick?: FeatureClickHandler;
  /** Makes the layer interactive and drives each symbol's `hover` values. */
  onHover?: FeatureHoverHandler;
}

// handle
export interface ILayerHandle {
  readonly id: string;
  setData(data: IFeatureCollection): void;
  setSymbols(symbols: ISymbols): void;
  setVisible(isVisible: boolean): void;
  remove(): void;
}

export interface ILayers {
  add(definition: ILayerDefinition): ILayerHandle;
  get(id: string): ILayerHandle | undefined;
}
