import type { AvatarVariant } from 'global/types/avatar';

export const clientAvatarVariant = (kind: string): AvatarVariant => (kind === 'company' ? 'patchwork' : 'notionists');
