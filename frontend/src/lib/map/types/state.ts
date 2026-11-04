// imports
import type { Bounds, LngLat } from './geo';

// state
/** The camera as last settled. Updated on `moveend`, never per frame. */
export interface IMapState {
  isReady: boolean;
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
  /** Visible area, or `null` before the map is ready. */
  bounds: Bounds | null;
}
