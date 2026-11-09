import { clientKeyOf } from 'finance/composables/cash-desk';
import { daysSince } from 'global/composables/date';
import { amountDue } from 'lot/composables/fee';
import type { IDebtContact } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

export type DebtFilter = 'all' | 'overdue' | 'untouched';

export interface IDebtRow {
  key: string;
  clientId: string;
  clientName: string;
  dueDh: number;
  lots: ILot[];
  oldestAt: string;
  ageDays: number;
  contacts: IDebtContact[];
  promisedOn: string | null;
  isPromiseOverdue: boolean;
}

/** The latest contact that set a date stands; a later contact without one does not cancel it. */
const latestPromise = (contacts: readonly IDebtContact[]): string | null => contacts.find((contact) => contact.promisedOn)?.promisedOn ?? null;

/** Clients who owe Milling Fees with no Payment recorded yet, oldest debt first, with what was done to collect it. */
export const debtRows = (lots: readonly ILot[], contacts: readonly IDebtContact[], today: string): IDebtRow[] => {
  const byClient = new Map<string, IDebtRow>();
  lots
    .filter((lot) => lot.mode === 'service' && amountDue(lot) > 0)
    .forEach((lot) => {
      const key = clientKeyOf(lot);
      const row = byClient.get(key) ?? { key, clientId: lot.clientId, clientName: lot.clientName, dueDh: 0, lots: [], oldestAt: lot.receivedAt, ageDays: 0, contacts: [], promisedOn: null, isPromiseOverdue: false };
      row.dueDh = Math.round((row.dueDh + amountDue(lot)) * 100) / 100;
      row.lots.push(lot);
      if (lot.receivedAt < row.oldestAt) row.oldestAt = lot.receivedAt;
      byClient.set(key, row);
    });
  return [...byClient.values()]
    .map((row) => {
      const own = contacts.filter((contact) => row.clientId && contact.clientId === row.clientId).sort((first, second) => second.at.localeCompare(first.at));
      const promisedOn = latestPromise(own);
      return {
        ...row,
        lots: row.lots.sort((first, second) => first.receivedAt.localeCompare(second.receivedAt)),
        ageDays: daysSince(row.oldestAt),
        contacts: own,
        promisedOn,
        isPromiseOverdue: !!promisedOn && promisedOn < today,
      };
    })
    .sort((first, second) => first.oldestAt.localeCompare(second.oldestAt));
};

export const matchesDebtFilter = (row: IDebtRow, filter: DebtFilter): boolean => {
  if (filter === 'overdue') return row.isPromiseOverdue;
  if (filter === 'untouched') return !row.contacts.length;
  return true;
};
