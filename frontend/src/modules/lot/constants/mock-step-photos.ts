import type { ILot, LotStepKey } from 'lot/types/lot';

interface IStepScene {
  title: string;
  sky: string;
  ground: string;
  /** Not every Lot has a photo of this step: the ones whose code number divides by this do. */
  everyNth: number;
}

const STEP_SCENES: Partial<Record<LotStepKey, IStepScene>> = {
  reception: { title: 'Arrivée des olives', sky: '#D2D6BD', ground: '#73835A', everyNth: 1 },
  pressed: { title: 'Sortie de presse', sky: '#E9C46A', ground: '#A66127', everyNth: 1 },
  stored: { title: 'Versement en cuve', sky: '#E7E5E4', ground: '#78716C', everyNth: 3 },
  withdrawn: { title: 'Retrait des bidons', sky: '#EFE9DC', ground: '#5C6A47', everyNth: 1 },
};

const stepPhoto = (scene: IStepScene, code: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="${scene.sky}"/>
    <path d="M0 340 Q200 280 400 330 T800 310 V500 H0 Z" fill="${scene.ground}"/>
    <circle cx="640" cy="110" r="46" fill="#FAFAF9" opacity="0.7"/>
    <text x="40" y="420" font-family="sans-serif" font-size="34" font-weight="700" fill="#FAFAF9">${scene.title}</text>
    <text x="40" y="460" font-family="sans-serif" font-size="20" fill="#FAFAF9">${code} · photo de démonstration</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/** Placeholder photos for the steps a Lot has reached, until Operators can take real ones. */
export const mockStepPhotos = (code: string, steps: readonly LotStepKey[]): ILot['stepPhotos'] => {
  const codeNumber = Number(code.slice(-4));
  return Object.fromEntries(
    steps.flatMap((step) => {
      const scene = STEP_SCENES[step];
      return scene && codeNumber % scene.everyNth === 0 ? [[step, stepPhoto(scene, code)]] : [];
    }),
  );
};
