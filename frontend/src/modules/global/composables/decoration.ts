import { renderAvatarDataUri, type DecorationStyleName } from '~/plugins/dicebear';

import { DECORATION_OPTIONS, PAGE_DECORATION_OPTIONS } from 'global/constants/decoration';

const OPTIONS: Record<DecorationStyleName, Record<string, unknown>> = { rings: DECORATION_OPTIONS, triangles: PAGE_DECORATION_OPTIONS };

const rendered = new Map<string, Promise<string>>();

/** A decoration for a seed, rendered once per style and seed and shared by everything that shows it: rings in a metric card's corner, triangles in a page's. */
export const renderDecoration = (seed: string, style: DecorationStyleName = 'rings'): Promise<string> => {
  const key = `${style}:${seed}`;
  const cached = rendered.get(key);
  if (cached) return cached;
  const uri = renderAvatarDataUri(style, { seed, ...OPTIONS[style] });
  uri.catch(() => rendered.delete(key));
  rendered.set(key, uri);
  return uri;
};
