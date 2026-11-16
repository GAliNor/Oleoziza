import { beforeAll, describe, expect, it } from 'vitest';

import { buildProvinceShapes, type IProvinceShapes } from 'territory/composables/province-shapes';
import { PROVINCES_MOCK } from 'territory/constants/mock-provinces';
import { readMockProvinces } from 'territory/services/territory.mock';

describe('buildProvinceShapes', () => {
  let shapes: IProvinceShapes;

  beforeAll(async () => {
    shapes = buildProvinceShapes(await readMockProvinces());
  });

  it('draws every province of the Oriental once', () => {
    expect(shapes.shapes.map((shape) => shape.id).sort()).toEqual(PROVINCES_MOCK.map((province) => province.id).sort());
    shapes.shapes.forEach((shape) => expect(shape.path).toMatch(/^M[\d.]+ [\d.]+L.*Z$/));
  });

  it('places every label inside the frame', () => {
    shapes.shapes.forEach((shape) => {
      expect(shape.labelLeft).toBeGreaterThan(0);
      expect(shape.labelLeft).toBeLessThan(100);
      expect(shape.labelTop).toBeGreaterThan(0);
      expect(shape.labelTop).toBeLessThan(100);
    });
  });

  it('keeps the Region taller than wide, north up', () => {
    expect(shapes.height).toBeGreaterThan(shapes.width);
    const nador = shapes.shapes.find((shape) => shape.id === 'nador');
    const figuig = shapes.shapes.find((shape) => shape.id === 'figuig');
    expect(nador!.labelTop).toBeLessThan(figuig!.labelTop);
  });

  it('leaves out a Province without an outline, until the Provinces are loaded', () => {
    expect(buildProvinceShapes(PROVINCES_MOCK).shapes).toEqual([]);
  });
});
