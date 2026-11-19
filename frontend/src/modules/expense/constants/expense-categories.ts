import type { ExpenseVatNature, IExpenseCategory } from 'expense/types/expense';

/** [slug, suggested CGNC account, TVA nature, TVA never deductible]. Mapping proposed by research/moroccan-expense-register.md §4.2, for the accountant to override. */
type SubcategorySeed = [string, string | null, ExpenseVatNature, boolean?];

/** Mirror of the backend seed, in the owner's order; every category closes on an « Autre ». */
const TREE: Record<string, SubcategorySeed[]> = {
  staff: [
    ['salaries', '61711', 'none'],
    ['cnss', '61741', 'none'],
    ['bonuses', '61712', 'none'],
    ['overtime', '61711', 'none'],
    ['seasonal_workers', '61711', 'none'],
    ['staff_meals', '61768', 'good'],
    ['staff_other', '6171', 'none'],
  ],
  energy: [
    ['electricity', '61251', 'good'],
    ['water', '61251', 'good'],
    ['site_fuel', '61223', 'good'],
    ['olive_pomace', '61223', 'good'],
    ['generator_diesel', '61223', 'good'],
    ['energy_other', '6125', 'good'],
  ],
  maintenance: [
    ['machine_upkeep', '61332', 'service'],
    ['spare_parts', '61225', 'good'],
    ['greasing', '61225', 'good'],
    ['cleaning_products', '61224', 'good'],
    ['gloves', '61225', 'good'],
    ['bags', '61225', 'good'],
    ['paper', '61254', 'good'],
    ['small_tools', '61253', 'good'],
    ['maintenance_other', '6133', 'service'],
  ],
  premises: [
    ['rent', '61312', 'service'],
    ['gardening', '61331', 'service'],
    ['outdoor_upkeep', '61331', 'service'],
    ['plumbing', '61331', 'service'],
    ['building_electrics', '61331', 'service'],
    ['painting', '61331', 'service'],
    ['small_repairs', '61331', 'service'],
    ['site_cleaning', '61331', 'service'],
    ['premises_other', '6131', 'service'],
  ],
  transport: [
    ['goods_transport', '61425', 'service'],
    ['deliveries', '61426', 'service'],
    ['vehicle_fuel', '6122', 'good'],
    ['vehicle_upkeep', '61332', 'service'],
    ['vehicle_insurance', '61345', 'none'],
    ['transport_other', '6142', 'service'],
  ],
  administration: [
    ['fire_insurance', '61341', 'none'],
    ['liability_insurance', '61343', 'none'],
    ['accountant', '61365', 'service'],
    ['lawyer', '61367', 'service'],
    ['bank_fees', '61473', 'service'],
    ['phone', '61455', 'service'],
    ['internet', '61455', 'service'],
    ['taxes_and_fees', '6167', 'none'],
    ['administration_other', '6136', 'service'],
  ],
  compliance: [
    ['lab_analyses', '61263', 'service'],
    ['onssa', '61678', 'none'],
    ['weighbridge_check', '61263', 'service'],
    ['extinguishers', '61332', 'service'],
    ['civil_protection', '61678', 'none'],
    ['pest_control', '61263', 'service'],
    ['ppe', '61764', 'good'],
    ['periodic_checks', '61263', 'service'],
    ['compliance_other', '6126', 'service'],
  ],
  commercial: [
    ['advertising', '61441', 'service'],
    ['social_media', '61441', 'service'],
    ['website', '61263', 'service'],
    ['amana_app', '61263', 'service'],
    ['server_cloud', '61263', 'service'],
    ['printing', '61442', 'service'],
    ['trade_fairs', '61443', 'service'],
    ['commercial_spending', '6143', 'service', true],
    ['commercial_other', '6144', 'service'],
  ],
  miscellaneous: [['miscellaneous_other', null, 'none']],
  stock_purchase: [
    ['olives', '61211', 'good'],
    ['oil', '6111', 'good'],
    ['bottles', '61231', 'good'],
    ['jerrycans', '61231', 'good'],
    ['caps', '61231', 'good'],
    ['cartons', '61231', 'good'],
    ['pallets', '61232', 'good'],
    ['stock_purchase_other', '612', 'good'],
  ],
  investment: [
    ['machines', '23321', 'fixed_asset'],
    ['tanks', '2331', 'fixed_asset'],
    ['vehicles', '2340', 'fixed_asset'],
    ['building', '23211', 'fixed_asset'],
    ['heavy_equipment', '23321', 'fixed_asset'],
    ['investment_other', '23', 'fixed_asset'],
  ],
};

export const INVESTMENT_CATEGORY_ID = 'investment';

/** Kept for the Expenses already filed under them, no longer offered: the mill has no generator any more (owner, 2026-11-19). */
const RETIRED_IDS: readonly string[] = ['generator_diesel'];

/** Costs the cash limits of the CGI leave out: staff, taxes, and olives bought from farmers. */
export const CASH_LIMIT_EXEMPT_IDS: readonly string[] = ['staff', 'olives', 'taxes_and_fees', 'onssa', 'civil_protection'];

export const EXPENSE_CATEGORIES_MOCK: IExpenseCategory[] = Object.entries(TREE).flatMap(([categoryId, children], categoryIndex) => [
  { id: categoryId, type: 'category' as const, parentId: null, position: categoryIndex + 1, isActive: true, accountCode: null, vatNature: 'none' as const, isVatNeverDeductible: false },
  ...children.map(([id, accountCode, vatNature, isVatNeverDeductible = false], index) => ({ id, type: 'subcategory' as const, parentId: categoryId, position: index + 1, isActive: !RETIRED_IDS.includes(id), accountCode, vatNature, isVatNeverDeductible })),
]);
