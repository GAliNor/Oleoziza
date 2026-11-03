import { renderAvatarDataUri } from '~/plugins/dicebear';

import { AVATAR_STYLES } from 'global/constants/avatar';
import type { AvatarKind } from 'global/types/avatar';

export const renderAvatar = (kind: AvatarKind, seed: string): Promise<string> =>
  renderAvatarDataUri(AVATAR_STYLES[kind].style, { seed, ...AVATAR_STYLES[kind].options });

export const toInitials = (name: string): string => {
  const words = name.split(/\s+/).filter((word) => word.length > 2);
  return (words.length ? words : [name])
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};
