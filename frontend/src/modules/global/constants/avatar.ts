import type { AvatarKind } from 'global/types/avatar';

const MALE_HAIR = [
  'hat',
  ...[1, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 38, 40, 42, 44, 49, 50, 52, 53, 54, 55, 56].map(
    (number) => `variant${String(number).padStart(2, '0')}`,
  ),
];

const PALETTE = {
  primaryOliveLight: '#D2D6BD',
  primaryOlive: '#73835A',
  primaryOliveDark: '#5C6A47',
  accentRust: '#A66127',
  accentBrown: '#8B5A2B',
  accentSand: '#D4A373',
  accentGold: '#E9C46A',
  neutral50: '#FAFAF9',
};

export const AVATAR_STYLES: Record<AvatarKind, { load: () => Promise<{ default: object }>; options: Record<string, unknown> }> = {
  client: {
    load: () => import('@dicebear/styles/notionists.json'),
    options: { hairVariant: MALE_HAIR, beardProbability: 35, gestureProbability: 0, glassesProbability: 15, scale: 1.4, translateY: 8 },
  },
  company: {
    load: () => import('@dicebear/styles/patchwork.json'),
    options: {
      backgroundColor: PALETTE.neutral50,
      fabricAColor: [PALETTE.accentRust, PALETTE.accentBrown],
      fabricBColor: [PALETTE.primaryOlive, PALETTE.primaryOliveDark],
      fabricCColor: [PALETTE.accentGold, PALETTE.accentSand],
    },
  },
  user: {
    load: () => import('@dicebear/styles/line-face.json'),
    options: {
      mouthVariant: ['smile', 'pleased', 'soft'],
      eyesVariant: ['happy', 'dots', 'closed', 'wink'],
      backgroundColor: [PALETTE.primaryOliveLight, PALETTE.accentSand, PALETTE.accentGold],
    },
  },
};
