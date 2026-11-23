import { amountExclVat, categoryIdOf, vatOf } from 'expense/composables/expense-amounts';
import { expenseWarnings } from 'expense/composables/expense-warnings';
import type { IExpense, IExpenseCategory } from 'expense/types/expense';
import type { IPeriodRange } from 'global/types/period';

type Label = (key: string) => string;

const SEPARATOR = ';';
const COLUMNS = [
  'code',
  'site',
  'date',
  'invoiceDate',
  'invoiceNumber',
  'supplier',
  'supplierIf',
  'supplierIce',
  'description',
  'category',
  'subcategory',
  'account',
  'vatNature',
  'vatRate',
  'exclVat',
  'vat',
  'inclVat',
  'paidBy',
  'paymentReference',
  'alert',
  'documents',
  'status',
] as const;

/** Quoted only when needed, quotes doubled, as Excel and accounting packages read it. */
const cell = (value: string | number): string => {
  const text = String(value);
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Two decimals with a comma: the way French-locale Excel reads a number. */
const amount = (value: number): string => value.toFixed(2).replace('.', ',');

const day = (isoDate: string | null): string => (isoDate ? isoDate.split('-').reverse().join('/') : '');

const vatRateLabel = (expense: IExpense, label: Label): string => {
  if (expense.vatRate === null) return label('outside');
  return expense.vatRate === 0 ? label('exempt') : `${expense.vatRate} %`;
};

/** The months an accountant asks for, newest first, from the given first day up to today. */
export const exportMonths = (firstDay: string, today: string): IPeriodRange[] => {
  const months: IPeriodRange[] = [];
  for (let cursor = new Date(`${firstDay.slice(0, 7)}-01T12:00:00Z`); cursor.toISOString().slice(0, 10) <= today; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const from = cursor.toISOString().slice(0, 10);
    const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10);
    months.unshift({ from, to: last < today ? last : today });
  }
  return months;
};

/**
 * The register for the accountant: one row per Expense by payment date, the TVA deduction-list fields (CGI art. 112-II), the suggested CGNC account and the warnings; cancelled ones last.
 * `label` reads `expense.export.*` and `expense.categories.*` keys without their prefix.
 */
export const buildExpenseCsv = (expenses: readonly IExpense[], categories: readonly IExpenseCategory[], siteNames: Record<string, string>, label: Label): string => {
  const rows = expenses.filter((expense) => expense.paymentState === 'paid').sort((first, second) => Number(first.status === 'cancelled') - Number(second.status === 'cancelled') || (first.date ?? '').localeCompare(second.date ?? '') || (first.code ?? '').localeCompare(second.code ?? ''));
  const lines = rows.map((expense) => {
    const subcategory = categories.find((item) => item.id === expense.categoryId);
    const warnings = expense.status === 'recorded' ? expenseWarnings(expense, categories) : [];
    const values: Record<(typeof COLUMNS)[number], string | number> = {
      code: expense.code ?? '',
      site: siteNames[expense.siteId] ?? '',
      date: day(expense.date),
      invoiceDate: day(expense.invoiceDate),
      invoiceNumber: expense.invoiceNumber,
      supplier: expense.supplier,
      supplierIf: expense.supplierIf,
      supplierIce: expense.supplierIce,
      description: expense.description || label(`categories.${expense.categoryId}`),
      category: label(`categories.${categoryIdOf(categories, expense.categoryId)}`),
      subcategory: label(`categories.${expense.categoryId}`),
      account: subcategory?.accountCode ?? '',
      vatNature: label(`export.vatNature.${subcategory?.vatNature ?? 'none'}`),
      vatRate: vatRateLabel(expense, (key) => label(`export.vatRate.${key}`)),
      exclVat: amount(amountExclVat(expense.amount ?? 0, expense.vatRate)),
      vat: amount(vatOf(expense.amount ?? 0, expense.vatRate)),
      inclVat: amount(expense.amount ?? 0),
      paidBy: expense.paidBy ? label(`paidBy.${expense.paidBy}`) : '',
      paymentReference: expense.paymentReference,
      alert: warnings.map((warning) => label(`export.alerts.${warning}`)).join(' / '),
      documents: expense.documents.length,
      status: label(`export.status.${expense.status}`),
    };
    return COLUMNS.map((column) => cell(values[column])).join(SEPARATOR);
  });
  const header = COLUMNS.map((column) => cell(label(`export.columns.${column}`))).join(SEPARATOR);
  return `﻿${[header, ...lines].join('\r\n')}\r\n`;
};
