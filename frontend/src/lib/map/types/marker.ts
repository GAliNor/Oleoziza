// imports
import type { LngLat, PixelPoint } from './geo';
import type { SymbolAnchor } from './style';

// options
export type MarkerAnchor = SymbolAnchor;

export interface IMarkerOptions {
  lngLat: LngLat;
  /** Which part of the element sits on `lngLat`. Default `center`. */
  anchor?: MarkerAnchor;
  offset?: PixelPoint;
  /** Default true. */
  isVisible?: boolean;
  /** Shows the pointer cursor over the element. */
  isInteractive?: boolean;
}

// handle
export interface IMarkerHandle {
  /** The element the map positions. Render anything into it (Vue `<Teleport :to>`). */
  readonly element: HTMLElement;
  setLngLat(lngLat: LngLat): void;
  setVisible(isVisible: boolean): void;
  remove(): void;
}

export interface IMarkers {
  add(options: IMarkerOptions): IMarkerHandle;
}
