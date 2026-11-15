import { describe, expect, it } from 'vitest';

import { expenseWarnings } from 'expense/composables/expense-warnings';
import { EXPENSE_CATEGORIES_MOCK } from 'expense/constants/expense-categories';
import type { IExpensePayload } from 'expense/types/expense';

const draft = (overrides: Partial<IExpensePayload>): Parameters<typeof expenseWarnings>[0] => ({
  categoryId: 'spare_parts',
  amount: 1000,
  vatRate: 20,
  paidBy: 'transfer',
  invoiceNumber: 'F-1',
  supplierIce: '001456789000012',
  ...overrides,
});

const warn = (overrides: Partial<IExpensePayload>) => expenseWarnings(draft(overrides), EXPENSE_CATEGORIES_MOCK);

describe('Cash limits of the CGI', () => {
  it('warns when more than 5 000 DH goes to a supplier in cash', () => {
    expect(warn({ paidBy: 'cash', amount: 5200 })).toEqual(['cash_over_daily_limit']);
  });

  it('stays quiet at 5 000 DH or by cheque', () => {
    expect(warn({ paidBy: 'cash', amount: 5000 })).toEqual([]);
    expect(warn({ paidBy: 'cheque', amount: 50000 })).toEqual([]);
  });

  it('leaves out olives bought from farmers and staff costs', () => {
    expect(warn({ paidBy: 'cash', amount: 9200, categoryId: 'olives', vatRate: null })).toEqual([]);
    expect(warn({ paidBy: 'cash', amount: 13500, categoryId: 'seasonal_workers', vatRate: null })).toEqual([]);
  });

  it('warns on any Investment paid in cash, whatever the amount', () => {
    expect(warn({ paidBy: 'cash', amount: 1500, categoryId: 'heavy_equipment' })).toEqual(['investment_in_cash']);
  });
});

describe('TVA the accountant cannot claim back', () => {
  it('warns when an Expense with TVA has no invoice number or no supplier ICE', () => {
    expect(warn({ invoiceNumber: '', supplierIce: '' })).toEqual(['vat_without_invoice', 'vat_without_ice']);
  });

  it('asks nothing of an Expense without TVA', () => {
    expect(warn({ vatRate: null, invoiceNumber: '', supplierIce: '' })).toEqual([]);
    expect(warn({ vatRate: 0, invoiceNumber: '', supplierIce: '' })).toEqual([]);
  });

  it('flags receptions, whose TVA is never deductible', () => {
    expect(warn({ categoryId: 'commercial_spending' })).toEqual(['vat_never_deductible']);
  });
});
