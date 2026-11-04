// imports
import type { Bounds, LngLat } from './geo';

// options
export interface ICameraOptions {
  center?: LngLat;
  zoom?: number;
  /** Degrees clockwise from north. */
  bearing?: number;
  /** Degrees from straight down. */
  pitch?: number;
  /** Milliseconds. Ignored by `jumpTo`. */
  duration?: number;
}

export interface IFitBoundsOptions {
  maxZoom?: number;
  duration?: number;
}

/** Screen areas covered by the host's UI, in CSS pixels. Camera calls frame inside what is left. */
export interface IInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ICameraLimits {
  maxBounds?: Bounds | null;
  minZoom?: number;
  maxZoom?: number;
}

// camera
export interface ICamera {
  fitBounds(bounds: Bounds, options?: IFitBoundsOptions): void;
  easeTo(options: ICameraOptions): void;
  flyTo(options: ICameraOptions): void;
  jumpTo(options: ICameraOptions): void;
  /** Kept and applied to every later camera call. Eases so the visible centre stays put. */
  setInsets(insets: Partial<IInsets>): void;
  getInsets(): IInsets;
  setLimits(limits: ICameraLimits): void;
}
