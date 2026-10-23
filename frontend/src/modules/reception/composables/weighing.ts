import type { ContainerKind, ILot, ISiteReceptionSettings, IWeighingDraft } from 'reception/types/reception';

export const createWeighingDraft = (kind: IWeighingDraft['kind'] = 'gross'): IWeighingDraft => ({
  kind,
  grossKg: null,
  netKgTyped: null,
  containers: { sac: 0, caisse: 0 },
  source: 'manual',
});

export const tareKg = (containers: Record<ContainerKind, number>, settings: ISiteReceptionSettings | null): number =>
  settings ? containers.sac * settings.containerTareKg.sac + containers.caisse * settings.containerTareKg.caisse : 0;

export const draftNetKg = (draft: IWeighingDraft, settings: ISiteReceptionSettings | null): number =>
  draft.kind === 'net'
    ? (draft.netKgTyped ?? 0)
    : Math.max(Math.round(((draft.grossKg ?? 0) - tareKg(draft.containers, settings)) * 10) / 10, 0);

export const isDraftValid = (draft: IWeighingDraft, settings: ISiteReceptionSettings | null): boolean =>
  draft.kind === 'net' ? (draft.netKgTyped ?? 0) > 0 : (draft.grossKg ?? 0) > tareKg(draft.containers, settings);

export const isTareOverGross = (draft: IWeighingDraft, settings: ISiteReceptionSettings | null): boolean =>
  draft.kind === 'gross' && !!draft.grossKg && !isDraftValid(draft, settings);

export const weighedContainers = (lot: ILot): number =>
  lot.weighings.reduce((total, weighing) => total + weighing.containers.sac + weighing.containers.caisse, 0);
