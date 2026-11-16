import type { Bounds, LngLat } from 'map';

import { ORIENTAL_BOUNDS } from 'territory/constants/provinces';
import type { IProvince, ProvinceBoundary, ProvinceId } from 'territory/types/territory';

export interface IProvinceShape {
  id: ProvinceId;
  name: string;
  path: string;
  labelLeft: number;
  labelTop: number;
}

export interface IProvinceShapes {
  width: number;
  height: number;
  shapes: IProvinceShape[];
}

type Ring = LngLat[];

const VIEW_WIDTH = 1000;
const INSET_RATIO = 0.04;

const mercatorY = (lat: number): number => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;

const projector = (bounds: Bounds): { width: number; height: number; project: (point: LngLat) => [number, number] } => {
  const [[west, south], [east, north]] = bounds;
  const top = mercatorY(north);
  const spanX = east - west;
  const spanY = top - mercatorY(south);
  const inset = spanX * INSET_RATIO;
  const scale = VIEW_WIDTH / (spanX + inset * 2);
  return {
    width: VIEW_WIDTH,
    height: (spanY + inset * 2) * scale,
    project: ([lng, lat]) => [(lng - west + inset) * scale, (top - mercatorY(lat) + inset) * scale],
  };
};

const ringsOf = (geometry: ProvinceBoundary): Ring[] => (geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat());

const pathOf = (geometry: ProvinceBoundary, project: (point: LngLat) => [number, number]): string =>
  ringsOf(geometry)
    .map((ring) => `M${ring.map((point) => project(point).map((value) => value.toFixed(1)).join(' ')).join('L')}Z`)
    .join('');

/** The provinces projected (Web Mercator, framed on the Oriental) into an SVG view box, with label positions in percent of it; a Province without an outline is left out. */
export const buildProvinceShapes = (provinces: readonly IProvince[]): IProvinceShapes => {
  const { width, height, project } = projector(ORIENTAL_BOUNDS);
  const shapes = provinces.flatMap((province) => {
    if (!province.boundary) return [];
    const [x, y] = project(province.labelAt);
    return [{ id: province.id, name: province.name, path: pathOf(province.boundary, project), labelLeft: (x / width) * 100, labelTop: (y / height) * 100 }];
  });
  return { width, height, shapes };
};
