import { formatTank } from 'configuration/composables/equipment';
import { tankStates } from 'lot/composables/storage';
import type { ITankSetting } from 'configuration/types/configuration';
import type { ITank } from 'dashboard/types/dashboard';
import type { ILot } from 'lot/types/lot';

export interface ISiteTanks {
  siteId: string;
  siteName: string;
  tanks: ITankSetting[];
}

/** The Tanks of the Sites in scope, filled from the oil the Lots still store, named with their Site when several are in scope. */
export const tankFill = (sites: readonly ISiteTanks[], lots: readonly ILot[]): ITank[] => {
  const isMultiSite = sites.length > 1;
  return sites.flatMap((site) =>
    tankStates(site.tanks, lots.filter((lot) => lot.siteId === site.siteId)).map((state) => ({
      id: state.tank.id,
      siteId: site.siteId,
      name: isMultiSite ? `${site.siteName} · ${formatTank(state.tank)}` : formatTank(state.tank),
      capacityLitres: state.tank.capacityLitres,
      fillLitres: state.fillLitres,
      variety: state.variety,
    })),
  );
};
