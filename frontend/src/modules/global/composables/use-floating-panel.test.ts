import { describe, expect, it } from 'vitest';

import { alignPanel, placePanel } from 'global/composables/use-floating-panel';

const anchorAt = (top: number, left = 100, width = 200, height = 52): DOMRect => ({ top, bottom: top + height, left, right: left + width, width, height, x: left, y: top, toJSON: () => ({}) });

describe('dropdown panel placement', () => {
  it('opens below the trigger when the screen has room there', () => {
    expect(placePanel(anchorAt(100), { top: 0, bottom: 1000, width: 1200 }, 300)).toEqual({ placement: 'below', maxHeight: 1000 - 152 - 16 });
  });

  it('opens above a trigger low on the screen, as when a tablet keyboard covers the bottom half', () => {
    const placed = placePanel(anchorAt(420), { top: 0, bottom: 540, width: 820 }, 300);
    expect(placed.placement).toBe('above');
    expect(placed.maxHeight).toBe(420 - 16);
  });

  it('stays below when a short list fits there, even if there is more room above', () => {
    expect(placePanel(anchorAt(600), { top: 0, bottom: 800, width: 820 }, 120).placement).toBe('below');
  });

  it('measures room inside the visible part of the page once it has scrolled under the keyboard', () => {
    expect(placePanel(anchorAt(900), { top: 700, bottom: 1240, width: 820 }, 300)).toEqual({ placement: 'below', maxHeight: 1240 - 952 - 16 });
  });

  it('keeps a wide panel inside the screen', () => {
    expect(alignPanel(anchorAt(0, 700, 100), 384, 820, false)).toBe(820 - 384 - 8);
    expect(alignPanel(anchorAt(0, 100, 200), 384, 820, false)).toBe(100);
  });

  it('lines the panel up on the right edge of the trigger in Arabic', () => {
    expect(alignPanel(anchorAt(0, 500, 200), 300, 820, true)).toBe(400);
    expect(alignPanel(anchorAt(0, 20, 100), 300, 820, true)).toBe(8);
  });
});
