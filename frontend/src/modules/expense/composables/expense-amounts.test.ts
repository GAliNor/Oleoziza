import { describe, expect, it } from 'vitest';

import { amountExclVat, groupByType, groupCategories, resultOf, summarizeExpenses, vatOf } from 'expense/composables/expense-amounts';
import { EXPENSE_CATEGORIES_MOCK } from 'expense/constants/expense-categories';
import type { IExpense } from 'expense/types/expense';

const expense = (categoryId: string, amount: number, overrides: Partial<IExpense> = {}): IExpense => ({
  id: `${categoryId}-${amount}`,
  seasonId: null,
  seasonLabel: null,
  isLocked: false,
  paymentState: 'paid',
  dueOn: null,
  recurringExpenseId: null,
  frequency: null,
  code: null,
  siteId: 'site',
  date: '2026-11-10',
  categoryId,
  description: '',
  amount,
  vatRate: null,
  supplierId: null,
  supplier: '',
  supplierIce: '',
  supplierIf: '',
  invoiceNumber: '',
  invoiceDate: null,
  paidBy: 'cash',
  paymentReference: '',
  documents: [],
  status: 'recorded',
  recordedBy: 'Ali',
  recordedAt: '2026-11-10T10:00:00+01:00',
  ...overrides,
});

describe('TVA inside an amount TTC', () => {
  it('splits 1 200 DH at 20 % into 1 000 HT and 200 TVA', () => {
    expect(vatOf(1200, 20)).toBe(200);
    expect(amountExclVat(1200, 20)).toBe(1000);
  });

  it('counts no TVA on an Expense without a rate', () => {
    expect(vatOf(450, null)).toBe(0);
    expect(amountExclVat(450, null)).toBe(450);
  });
});

describe('Expense summary and Result', () => {
  const expenses = [
    expense('salaries', 30000),
    expense('cnss', 6000),
    expense('electricity', 1140, { vatRate: 14 }),
    expense('machines', 120000, { vatRate: 20 }),
    expense('rent', 5000, { status: 'cancelled', cancelReason: 'Saisie en double' }),
  ];

  it('files each sub-category under its category and leaves cancelled Expenses out', () => {
    const summary = summarizeExpenses(expenses, EXPENSE_CATEGORIES_MOCK);
    expect(summary.byCategory).toEqual([
      { categoryId: 'investment', amount: 120000, count: 1 },
      { categoryId: 'staff', amount: 36000, count: 2 },
      { categoryId: 'energy', amount: 1140, count: 1 },
    ]);
    expect(summary.count).toBe(4);
  });

  it('tells how much each sub-category cost: « j’appuie salaire, je sais combien »', () => {
    const summary = summarizeExpenses([...expenses, expense('salaries', 2000)], EXPENSE_CATEGORIES_MOCK);
    expect(summary.bySubcategory.map(({ categoryId, parentId, amount, count }) => [categoryId, parentId, amount, count])).toEqual([
      ['machines', 'investment', 120000, 1],
      ['salaries', 'staff', 32000, 2],
      ['cnss', 'staff', 6000, 1],
      ['electricity', 'energy', 1140, 1],
    ]);
  });

  it('keeps Investments apart from the operating Expenses', () => {
    const summary = summarizeExpenses(expenses, EXPENSE_CATEGORIES_MOCK);
    expect(summary.total).toBe(157140);
    expect(summary.investments).toBe(120000);
    expect(summary.operating).toBe(37140);
  });

  it('groups sub-category totals under their category, Investments last', () => {
    const groups = groupByType(summarizeExpenses(expenses, EXPENSE_CATEGORIES_MOCK));
    expect(groups.map((group) => [group.categoryId, group.rows.map((row) => row.categoryId)])).toEqual([
      ['staff', ['salaries', 'cnss']],
      ['energy', ['electricity']],
      ['investment', ['machines']],
    ]);
  });

  it('keeps only the category a link from the Dashboard asks for', () => {
    expect(groupByType(summarizeExpenses(expenses, EXPENSE_CATEGORIES_MOCK), 'energy').map((group) => group.categoryId)).toEqual(['energy']);
  });

  it('takes the Result as Revenue less operating Expenses, not Investments', () => {
    expect(resultOf(100000, summarizeExpenses(expenses, EXPENSE_CATEGORIES_MOCK))).toBe(62860);
  });
});

describe('Category groups', () => {
  it('gives every category an « Autre » sub-category, last', () => {
    const groups = groupCategories(EXPENSE_CATEGORIES_MOCK);
    expect(groups).toHaveLength(11);
    groups.forEach((group) => expect(group.subcategories.at(-1)?.id).toBe(`${group.category.id}_other`));
  });

  it('hides a retired sub-category', () => {
    const categories = EXPENSE_CATEGORIES_MOCK.map((item) => (item.id === 'olives' ? { ...item, isActive: false } : item));
    const stock = groupCategories(categories).find((group) => group.category.id === 'stock_purchase');
    expect(stock?.subcategories.map((item) => item.id)).not.toContain('olives');
  });
});
