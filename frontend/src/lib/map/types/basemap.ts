// basemap
export interface IBasemapLayer {
  /** XYZ tile URL template with `{z}`, `{x}` and `{y}`. */
  tiles: string;
  /** Default 256. */
  tileSize?: number;
  minZoom?: number;
  maxZoom?: number;
  attribution?: string;
}

/** Raster tiles drawn below every layer. Layers listed first draw first (base tiles, then labels). */
export interface IBasemap {
  id: string;
  layers: IBasemapLayer[];
  /** Color shown where no tile has loaded yet. */
  background?: string;
}
