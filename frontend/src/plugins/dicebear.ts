// imports
import { Avatar, Style } from '@dicebear/core';

// variables
export type AvatarStyleName = 'notionists' | 'patchwork' | 'line-face';

const STYLE_LOADERS: Record<AvatarStyleName, () => Promise<{ default: object }>> = {
  notionists: () => import('@dicebear/styles/notionists.json'),
  patchwork: () => import('@dicebear/styles/patchwork.json'),
  'line-face': () => import('@dicebear/styles/line-face.json'),
};

const styles = new Map<AvatarStyleName, Promise<Style>>();

// methods
const loadStyle = (name: AvatarStyleName): Promise<Style> => {
  const cached = styles.get(name);
  if (cached) return cached;
  const style = STYLE_LOADERS[name]().then((module) => new Style(module.default as never));
  style.catch(() => styles.delete(name));
  styles.set(name, style);
  return style;
};

/** Renders an avatar as a data URI, loading its style on first use. */
export const renderAvatarDataUri = async (name: AvatarStyleName, options: Record<string, unknown>): Promise<string> =>
  new Avatar(await loadStyle(name), options).toDataUri();
