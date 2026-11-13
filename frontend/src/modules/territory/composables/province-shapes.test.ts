import { describe, expect, it } from 'vitest';

import { PROVINCE_SHAPES } from 'territory/composables/province-shapes';
import { ORIENTAL_PROVINCES } from 'territory/constants/provinces';

describe('PROVINCE_SHAPES', () => {
  it('draws every province of the Oriental once', () => {
    expect(PROVINCE_SHAPES.shapes.map((shape) => shape.id).sort()).toEqual(ORIENTAL_PROVINCES.map((province) => province.id).sort());
    PROVINCE_SHAPES.shapes.forEach((shape) => expect(shape.path).toMatch(/^M[\d.]+ [\d.]+L.*Z$/));
  });

  it('places every label inside the frame', () => {
    PROVINCE_SHAPES.shapes.forEach((shape) => {
      expect(shape.labelLeft).toBeGreaterThan(0);
      expect(shape.labelLeft).toBeLessThan(100);
      expect(shape.labelTop).toBeGreaterThan(0);
      expect(shape.labelTop).toBeLessThan(100);
    });
  });

  it('keeps the Region taller than wide, north up', () => {
    expect(PROVINCE_SHAPES.height).toBeGreaterThan(PROVINCE_SHAPES.width);
    const nador = PROVINCE_SHAPES.shapes.find((shape) => shape.id === 'nador');
    const figuig = PROVINCE_SHAPES.shapes.find((shape) => shape.id === 'figuig');
    expect(nador!.labelTop).toBeLessThan(figuig!.labelTop);
  });
});
