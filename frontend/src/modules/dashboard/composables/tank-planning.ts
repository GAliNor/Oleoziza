import { formatTank } from 'configuration/composables/equipment';
import { toIsoDate } from 'global/composables/date';
import { ownerKindOf, tankStates } from 'lot/composables/storage';
import type { ITankSetting } from 'configuration/types/configuration';
import type { ITank, ITankStorage } from 'dashboard/types/dashboard';
import type { ILot } from 'lot/types/lot';

export interface ISiteTanks {
  siteId: string;
  siteName: string;
  tanks: ITankSetting[];
}

const DAY_MS = 86_400_000;

/** Days from today to an instant or a date, negative in the past. */
export const dayOffset = (at: string, today: string): number => Math.round((new Date(toIsoDate(at)).getTime() - new Date(today).getTime()) / DAY_MS);

/** The Tanks of the Sites in scope, filled from the Lots' Storages, and every Storage as a bar from its first day to its last. */
export const tankPlanning = (sites: readonly ISiteTanks[], lots: readonly ILot[], today: string, millLabel: string): { tanks: ITank[]; tankStorage: ITankStorage[] } => {
  const isMultiSite = sites.length > 1;
  const tanks = sites.flatMap((site) =>
    tankStates(site.tanks, lots.filter((lot) => lot.siteId === site.siteId)).map((state) => ({
      id: state.tank.id,
      siteId: site.siteId,
      name: isMultiSite ? `${site.siteName} · ${formatTank(state.tank)}` : formatTank(state.tank),
      capacityLitres: state.tank.capacityLitres,
      fillLitres: state.fillLitres,
      variety: state.variety,
    })),
  );
  const tankIds = new Set(tanks.map((tank) => tank.id));
  const tankStorage = lots.flatMap((lot) =>
    lot.storages
      .filter((storage) => tankIds.has(storage.tankId))
      .map((storage) => ({
        id: storage.id,
        tankId: storage.tankId,
        lotCode: lot.code,
        client: ownerKindOf(lot) === 'mill' ? millLabel : lot.clientName,
        kind: ownerKindOf(lot),
        litres: storage.litres,
        startDay: dayOffset(storage.from, today),
        endDay: storage.endedAt ? dayOffset(storage.endedAt, today) : null,
        plannedEndDay: storage.plannedUntil ? dayOffset(storage.plannedUntil, today) : null,
      })),
  );
  return { tanks, tankStorage };
};
