// imports
import { Avatar, Style } from '@dicebear/core';

// variables
export type AvatarStyleName = 'notionists' | 'patchwork' | 'line-face';
export type DecorationStyleName = 'rings' | 'triangles';
type StyleName = AvatarStyleName | DecorationStyleName;

const STYLE_LOADERS: Record<StyleName, () => Promise<{ default: object }>> = {
  notionists: () => import('@dicebear/styles/notionists.json'),
  patchwork: () => import('@dicebear/styles/patchwork.json'),
  'line-face': () => import('@dicebear/styles/line-face.json'),
  rings: () => import('@dicebear/styles/rings.json'),
  triangles: () => import('@dicebear/styles/triangles.json'),
};

const styles = new Map<StyleName, Promise<Style>>();

// methods
const loadStyle = (name: StyleName): Promise<Style> => {
  const cached = styles.get(name);
  if (cached) return cached;
  const style = STYLE_LOADERS[name]().then((module) => new Style(module.default as never));
  style.catch(() => styles.delete(name));
  styles.set(name, style);
  return style;
};

/** Renders an avatar or a decoration as a data URI, loading its style on first use. */
export const renderAvatarDataUri = async (name: StyleName, options: Record<string, unknown>): Promise<string> =>
  new Avatar(await loadStyle(name), options).toDataUri();
