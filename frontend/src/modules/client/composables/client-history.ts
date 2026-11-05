import { paymentStateOf } from 'lot/composables/fee';
import type { IClientLotLine } from 'client/types/client';
import type { ILot, LotStatus, PaymentState } from 'lot/types/lot';

export interface IClientHistoryRow {
  code: string;
  receivedOn: string;
  season: string;
  variety: string;
  kg: number;
  litres: number | null;
  withdrawnLitres: number;
  status: LotStatus;
  paymentState: PaymentState;
  lot: ILot | null;
}

/** The Season a date falls in, written like Lot codes: 2627 for 2026–2027, starting in October. */
export const seasonOf = (isoDate: string): string => {
  const year = Number(isoDate.slice(0, 4)) % 100;
  const start = Number(isoDate.slice(5, 7)) >= 10 ? year : year - 1;
  return `${String(start).padStart(2, '0')}${String(start + 1).padStart(2, '0')}`;
};

const fromLot = (lot: ILot): IClientHistoryRow => ({
  code: lot.code,
  receivedOn: lot.receivedAt.slice(0, 10),
  season: seasonOf(lot.receivedAt.slice(0, 10)),
  variety: lot.variety,
  kg: lot.netKg,
  litres: lot.oilLitres,
  withdrawnLitres: lot.withdrawnLitres,
  status: lot.status,
  paymentState: paymentStateOf(lot),
  lot,
});

/** Past Lots are settled in the mock: until the backend, only this Season's Lots carry a real Payment State. */
const fromLine = (line: IClientLotLine): IClientHistoryRow => ({
  code: line.code,
  receivedOn: line.receivedOn,
  season: line.season,
  variety: line.variety,
  kg: line.kg,
  litres: line.oilLitres,
  withdrawnLitres: line.status === 'withdrawn' ? line.oilLitres : 0,
  status: line.status,
  paymentState: 'paid',
  lot: null,
});

/** Every Lot of the Client on the Site, newest first. */
export const clientHistory = (lots: readonly ILot[], lines: readonly IClientLotLine[], clientId: string): IClientHistoryRow[] => {
  const live = lots.filter((lot) => lot.clientId === clientId).map(fromLot);
  const known = new Set(live.map((row) => row.code));
  return [...live, ...lines.filter((line) => !known.has(line.code)).map(fromLine)].sort((first, second) => second.receivedOn.localeCompare(first.receivedOn));
};

/** Matches a Lot number, even typed without its prefix, or a day written 12/03 or 12/03/2026. */
export const matchesHistoryQuery = (row: IClientHistoryRow, query: string): boolean => {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  if (row.code.toLowerCase().includes(text)) return true;
  const [year, month, day] = row.receivedOn.split('-');
  return [`${day}/${month}`, `${day}/${month}/${year}`, `${Number(day)}/${Number(month)}`].some((form) => form.startsWith(text));
};
