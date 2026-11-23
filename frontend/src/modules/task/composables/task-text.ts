import { i18n } from '~/plugins/i18n';

import { daysSince } from 'global/composables/date';
import type { ITask } from 'task/types/task';

const { t, te } = i18n.global;

/** An Expense to pay whose due date has passed. */
export const isLate = (task: Pick<ITask, 'kind' | 'params'>): boolean => task.kind === 'expense-due' && Number(task.params.daysLeft) < 0;

export const taskTitle = (task: ITask): string => {
  if (task.kind === 'expense-due') return t(isLate(task) ? 'task.kinds.expense-due.late' : 'task.kinds.expense-due.title', { category: t(`expense.categories.${task.params.category}`) });
  return t(`task.kinds.${task.kind}.title`, task.params);
};

/** Under the title: whom it is about, what it comes from, and since when; an Expense counts down to its due date instead. */
export const taskDetail = (task: ITask): string => {
  if (task.kind === 'expense-due') {
    const days = Math.abs(Number(task.params.daysLeft));
    return [task.subject, t(isLate(task) ? 'expense.due.lateBy' : 'expense.due.inDays', { count: days }, days)].filter(Boolean).join(' · ');
  }
  const key = `task.kinds.${task.kind}.detail`;
  return [task.subject, te(key) ? t(key, task.params) : '', task.at ? t('task.since', daysSince(task.at)) : ''].filter(Boolean).join(' · ');
};
