import { todayIso } from 'global/composables/date';
import { periodRange } from 'global/composables/use-period';
import { MILLING_RATE } from 'lot/constants/lot';
import type { ClientPeriodKey, IClientActivity, IClientLotLine, IClientSiteFigures, ISiteConsumption } from 'client/types/client';

export const lotsInPeriod = (lots: IClientLotLine[], key: ClientPeriodKey, today: string = todayIso()): IClientLotLine[] => {
  if (key === 'all') return lots;
  const { from, to } = periodRange(key, today);
  return lots.filter((lot) => lot.receivedOn >= from && lot.receivedOn <= to);
};

/** What the lots add up to. `generatedDh` is the milling fees they earned the mill: olives × the Site's rate. */
export const summarizeActivity = (lots: IClientLotLine[]): IClientActivity => {
  const oliveKg = lots.reduce((sum, lot) => sum + lot.kg, 0);
  return { lots: lots.length, oliveKg, oilKg: lots.reduce((sum, lot) => sum + lot.oilKg, 0), generatedDh: oliveKg * MILLING_RATE };
};

/** What the Client brought to each of their Sites over the lots given, biggest first. */
export const siteConsumption = (lots: IClientLotLine[], sites: IClientSiteFigures[]): ISiteConsumption[] => {
  const totalKg = summarizeActivity(lots).oliveKg;
  return sites
    .map((site) => {
      const activity = summarizeActivity(lots.filter((lot) => lot.siteId === site.siteId));
      return { ...site, ...activity, sharePercent: totalKg ? Math.round((activity.oliveKg / totalKg) * 100) : 0 };
    })
    .sort((first, second) => second.oliveKg - first.oliveKg);
};
