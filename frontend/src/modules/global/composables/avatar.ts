import { renderAvatarDataUri } from '~/plugins/dicebear';

import { AVATAR_OPTIONS } from 'global/constants/avatar';
import type { AvatarVariant } from 'global/types/avatar';

export const renderAvatar = (variant: AvatarVariant, seed: string): Promise<string> =>
  renderAvatarDataUri(variant, { seed, ...AVATAR_OPTIONS[variant] });

export const toInitials = (name: string): string => {
  const words = name.split(/\s+/).filter((word) => word.length > 2);
  return (words.length ? words : [name])
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};
