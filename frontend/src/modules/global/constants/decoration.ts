import { PALETTE } from 'global/constants/avatar';

/** Rings, like a millstone or a tree's growth: the quiet mark in a metric card's corner. */
export const DECORATION_OPTIONS: Record<string, unknown> = {
  ringColor: [PALETTE.primaryOliveDark, PALETTE.primaryOlive, PALETTE.accentBrown, PALETTE.accentSand],
};

/** Triangles, like the facets of a cut olive grove seen from above: the slow, quiet mark in every page's corner. */
export const PAGE_DECORATION_OPTIONS: Record<string, unknown> = {
  backgroundColor: [PALETTE.primaryOliveLight, PALETTE.accentSand],
  shapeColor: [PALETTE.primaryOliveDark, PALETTE.accentBrown],
};
