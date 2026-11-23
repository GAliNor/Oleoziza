import { describe, expect, it } from 'vitest';

import { daysUntil, dueGroupOf, groupByDue, nextDueOn } from 'expense/composables/expense-due';
import type { IExpense } from 'expense/types/expense';

const TODAY = '2026-11-23';
const due = (id: string, dueOn: string): IExpense => ({ id, dueOn }) as IExpense;

describe('what is to pay', () => {
  it.each([
    ['2026-11-22', 'late'],
    ['2026-11-23', 'soon'],
    ['2026-12-23', 'soon'],
    ['2026-12-24', 'later'],
  ] as const)('due on %s is %s', (dueOn, group) => {
    expect(dueGroupOf(dueOn, TODAY)).toBe(group);
  });

  it('comes by urgency, without empty groups', () => {
    const groups = groupByDue([due('a', '2026-11-01'), due('b', '2027-03-01')], TODAY);
    expect(groups.map(({ group, expenses }) => [group, expenses.map((expense) => expense.id)])).toEqual([
      ['late', ['a']],
      ['later', ['b']],
    ]);
  });

  it('counts the days left, across a clock change', () => {
    expect([daysUntil('2026-11-23', TODAY), daysUntil('2026-11-20', TODAY), daysUntil('2027-03-31', '2027-03-21')]).toEqual([0, -3, 10]);
  });

  it('comes back on the same day of the month, or its last one', () => {
    expect([nextDueOn('2026-11-30', 'quarterly'), nextDueOn('2026-01-31', 'monthly'), nextDueOn('2026-12-05', 'monthly'), nextDueOn('2028-02-29', 'yearly')]).toEqual(['2027-02-28', '2026-02-28', '2027-01-05', '2029-02-28']);
  });
});
