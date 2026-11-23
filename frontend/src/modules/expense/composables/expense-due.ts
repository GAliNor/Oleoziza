import { shiftDate } from 'global/composables/date';
import type { ExpenseFrequency, IExpense } from 'expense/types/expense';

export type DueGroup = 'late' | 'soon' | 'later';

const SOON_DAYS = 30;

const DUE_GROUPS: readonly DueGroup[] = ['late', 'soon', 'later'];

/** Late once its due date has passed; soon within thirty days, today included. */
export const dueGroupOf = (dueOn: string, today: string): DueGroup => {
  if (dueOn < today) return 'late';
  return dueOn <= shiftDate(today, SOON_DAYS) ? 'soon' : 'later';
};

/** The Expenses to pay by urgency, empty groups left out. */
export const groupByDue = (expenses: readonly IExpense[], today: string): { group: DueGroup; expenses: IExpense[] }[] =>
  DUE_GROUPS.map((group) => ({ group, expenses: expenses.filter((expense) => expense.dueOn && dueGroupOf(expense.dueOn, today) === group) })).filter((entry) => entry.expenses.length);

/** Whole days between today and a due date, negative once late. */
export const daysUntil = (dueOn: string, today: string): number => Math.round((Date.parse(`${dueOn}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);

const MONTHS: Record<ExpenseFrequency, number> = { monthly: 1, quarterly: 3, yearly: 12 };

/** The due date after one: same day of the month, or its last day when it is shorter. */
export const nextDueOn = (from: string, frequency: ExpenseFrequency): string => {
  const [year, month, day] = from.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month + MONTHS[frequency], 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + MONTHS[frequency], Math.min(day, lastDay), 12)).toISOString().slice(0, 10);
};

/** Worth an alert, as the backend decides it: 30 days ahead for a quarterly or yearly one, 7 for any other, and every late one. */
export const isAlerted = (expense: Pick<IExpense, 'dueOn' | 'frequency'>, today: string): boolean => Boolean(expense.dueOn) && daysUntil(expense.dueOn ?? today, today) <= (expense.frequency === 'quarterly' || expense.frequency === 'yearly' ? 30 : 7);
