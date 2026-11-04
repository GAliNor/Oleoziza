import basinFrontUrl from '~/assets/mill-scene/basin-front.webp';
import crownLeftUrl from '~/assets/mill-scene/crown-left.webp';
import crownRightUrl from '~/assets/mill-scene/crown-right.webp';
import oliveUrl from '~/assets/mill-scene/olive.webp';
import phoneBasinFrontUrl from '~/assets/mill-scene/phone-basin-front.webp';
import phonePlateUrl from '~/assets/mill-scene/phone-plate.webp';
import plateUrl from '~/assets/mill-scene/plate.webp';
import stoneUrl from '~/assets/mill-scene/stone.webp';
import type { IMillSceneLayout } from 'auth/types/mill-scene';

export const MILL_SCENE_WIDE_MEDIA_QUERY = '(min-width: 768px)';

/** Coordinates are pixels on each composition's source canvas; the component turns them into percentages. */
export const MILL_SCENE_WIDE: IMillSceneLayout = {
  canvas: { width: 1224, height: 1285 },
  plate: { src: plateUrl, x: 0, y: 543, width: 1224, height: 742 },
  crowns: [
    { src: crownLeftUrl, x: 0, y: 543, width: 516, height: 295, pivotX: 180, pivotY: 798, swaySeconds: 9, swayDelaySeconds: 0 },
    { src: crownRightUrl, x: 909, y: 773, width: 315, height: 150, pivotX: 1068, pivotY: 903, swaySeconds: 7, swayDelaySeconds: 1.5 },
  ],
  olive: { src: oliveUrl, x: 557, y: 1014, width: 38, height: 28, travelX: 102, travelY: 32 },
  stone: { src: stoneUrl, x: 678, y: 827, width: 292, height: 292 },
  basinFront: { src: basinFrontUrl, x: 630, y: 1080, width: 362, height: 86 },
  stream: { path: 'M1041 1067 C1061 1070 1069 1090 1076 1125', width: 5 },
  tank: { x: 1080, y: 1163, width: 32, height: 58, radius: 6, levelHeight: 38 },
};

export const MILL_SCENE_PHONE: IMillSceneLayout = {
  canvas: { width: 2172, height: 600 },
  plate: { src: phonePlateUrl, x: 0, y: 0, width: 2172, height: 600 },
  crowns: [],
  olive: { src: oliveUrl, x: 848, y: 276, width: 57, height: 42, travelX: 160, travelY: 38 },
  stone: { src: stoneUrl, x: 1050, y: 12, width: 420, height: 420 },
  basinFront: { src: phoneBasinFrontUrl, x: 971, y: 369, width: 579, height: 144 },
  stream: { path: 'M1626 355 C1660 355 1688 359 1692 386', width: 7 },
  tank: { x: 1686, y: 437, width: 49, height: 88, radius: 9, levelHeight: 58 },
};
