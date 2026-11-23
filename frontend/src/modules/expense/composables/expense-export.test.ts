import { describe, expect, it } from 'vitest';

import { buildExpenseCsv, exportMonths } from 'expense/composables/expense-export';
import { EXPENSE_CATEGORIES_MOCK } from 'expense/constants/expense-categories';
import type { IExpense } from 'expense/types/expense';

const expense = (overrides: Partial<IExpense>): IExpense => ({
  id: 'e1',
  seasonId: null,
  seasonLabel: null,
  isLocked: false,
  paymentState: 'paid',
  dueOn: null,
  recurringExpenseId: null,
  frequency: null,
  code: 'OJ-C2627-0001',
  siteId: 'oj',
  date: '2026-11-05',
  categoryId: 'electricity',
  description: 'Électricité novembre',
  amount: 1200,
  vatRate: 20,
  supplierId: null,
  supplier: 'ONEE',
  supplierIce: '001531219000038',
  supplierIf: '1234567',
  invoiceNumber: 'E-11',
  invoiceDate: '2026-11-02',
  paidBy: 'transfer',
  paymentReference: 'VIR 42',
  documents: [],
  status: 'recorded',
  recordedBy: 'Nadia',
  recordedAt: '2026-11-05T10:00:00+01:00',
  ...overrides,
});

const label = (key: string): string => key;

const parse = (csv: string): string[][] =>
  csv
    .replace('﻿', '')
    .trim()
    .split('\r\n')
    .map((line) => line.split(';'));

describe('Register export for the accountant', () => {
  it('writes the deduction-list fields, amounts with a decimal comma and dates as dd/mm/yyyy', () => {
    const [header, row] = parse(buildExpenseCsv([expense({})], EXPENSE_CATEGORIES_MOCK, { oj: 'Oujda' }, label));
    const value = (column: string): string => row[header.indexOf(`export.columns.${column}`)];
    expect(value('date')).toBe('05/11/2026');
    expect(value('invoiceDate')).toBe('02/11/2026');
    expect(value('supplierIce')).toBe('001531219000038');
    expect(value('exclVat')).toBe('1000,00');
    expect(value('vat')).toBe('200,00');
    expect(value('inclVat')).toBe('1200,00');
    expect(value('account')).toBe('61251');
    expect(value('vatNature')).toBe('export.vatNature.good');
    expect(value('site')).toBe('Oujda');
  });

  it('puts cancelled Expenses after the recorded ones and flags what the accountant will check', () => {
    const csv = buildExpenseCsv(
      [expense({ id: 'a', code: 'A', status: 'cancelled' }), expense({ id: 'b', code: 'B', paidBy: 'cash', amount: 6000, invoiceNumber: '', paymentReference: '' })],
      EXPENSE_CATEGORIES_MOCK,
      {},
      label,
    );
    const [header, first, second] = parse(csv);
    expect(first[0]).toBe('B');
    expect(first[header.indexOf('export.columns.alert')]).toBe('export.alerts.cash_over_daily_limit / export.alerts.vat_without_invoice');
    expect(second[header.indexOf('export.columns.status')]).toBe('export.status.cancelled');
  });

  it('quotes a description holding the separator', () => {
    const csv = buildExpenseCsv([expense({ description: 'Joints; vis "sans fin"' })], EXPENSE_CATEGORIES_MOCK, {}, label);
    expect(csv).toContain('"Joints; vis ""sans fin"""');
  });

  it('starts with a byte-order mark so Excel reads the accents', () => {
    expect(buildExpenseCsv([], EXPENSE_CATEGORIES_MOCK, {}, label).startsWith('﻿')).toBe(true);
  });
});

describe('Months offered for the export', () => {
  it('lists whole months newest first, the current one cut at today', () => {
    expect(exportMonths('2026-09-15', '2026-11-15')).toEqual([
      { from: '2026-11-01', to: '2026-11-15' },
      { from: '2026-10-01', to: '2026-10-31' },
      { from: '2026-09-01', to: '2026-09-30' },
    ]);
  });
});
