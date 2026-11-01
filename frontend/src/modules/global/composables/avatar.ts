import { Avatar, Style } from '@dicebear/core';

import { AVATAR_STYLES } from 'global/constants/avatar';
import type { AvatarKind } from 'global/types/avatar';

const styles = new Map<AvatarKind, Promise<Style>>();

const loadStyle = (kind: AvatarKind): Promise<Style> => {
  if (!styles.has(kind)) {
    const style = AVATAR_STYLES[kind].load().then((module) => new Style(module.default as never));
    style.catch(() => styles.delete(kind));
    styles.set(kind, style);
  }
  return styles.get(kind)!;
};

export const renderAvatar = async (kind: AvatarKind, seed: string): Promise<string> =>
  new Avatar(await loadStyle(kind), { seed, ...AVATAR_STYLES[kind].options }).toDataUri();

export const toInitials = (name: string): string => {
  const words = name.split(/\s+/).filter((word) => word.length > 2);
  return (words.length ? words : [name])
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};
