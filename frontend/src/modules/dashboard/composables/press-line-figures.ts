import { toIsoDate } from 'global/composables/date';
import type { IPressLineFigures } from 'dashboard/types/dashboard';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

export interface ISiteLines {
  siteId: string;
  siteName: string;
  pressLines: IPressLineSetting[];
}

const HOUR_MS = 3_600_000;

const movedAt = (lot: ILot, status: ILot['status']): string | undefined => [...lot.moves].reverse().find((record) => record.status === status)?.at;

/** Per Press Line, the Lots whose Pressing ended in the period: olives, oil and the hours the line spent pressing them. */
export const pressLineFigures = (sites: readonly ISiteLines[], lots: readonly ILot[], from: string, to: string, labelOf: (line: IPressLineSetting) => string): IPressLineFigures[] => {
  const isMultiSite = sites.length > 1;
  return sites.flatMap((site) =>
    site.pressLines.map((line) => {
      const pressed = lots.filter((lot) => {
        const pressedAt = movedAt(lot, 'pressed');
        return lot.siteId === site.siteId && lot.pressLineId === line.id && lot.oilLitres !== null && !!pressedAt && toIsoDate(pressedAt) >= from && toIsoDate(pressedAt) <= to;
      });
      const pressingMs = pressed.reduce((sum, lot) => {
        const start = movedAt(lot, 'pressing');
        const end = movedAt(lot, 'pressed');
        return start && end ? sum + Math.max(0, new Date(end).getTime() - new Date(start).getTime()) : sum;
      }, 0);
      return {
        pressLineId: line.id,
        siteId: site.siteId,
        name: isMultiSite ? `${site.siteName} · ${labelOf(line)}` : labelOf(line),
        lots: pressed.length,
        olivesKg: pressed.reduce((sum, lot) => sum + lot.netKg, 0),
        oilLitres: pressed.reduce((sum, lot) => sum + (lot.oilLitres ?? 0), 0),
        pressingHours: Math.round((pressingMs / HOUR_MS) * 10) / 10,
      };
    }),
  );
};
