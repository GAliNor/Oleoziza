# Expense

## Business
Each Site's [Expenses](../../../../../GLOSSARY.md) (« Charges »): money already spent to run, stock or equip it, filed under a two-level [Expense Category](../../../../../GLOSSARY.md). The register is evidence for the external accountant's tax work, and its totals give the [Result](../../../../../GLOSSARY.md) (Revenue less every Expense but [Investments](../../../../../GLOSSARY.md)).

## Exposes
- View: `/charges` → `views/entry.vue`: tiles, category bar, search, type filter, numbered register; the detail and the form slide in over the list (`ui-master-detail`). URL: `?period`, `?category` (a category or a sub-category), `?page`, `?expense`.
- Store: `useExpenseStore`: the categories (`groups` getter), the register (`list`, one numbered page of 10 read from the server by `fetchPage`), `current` (an Expense opened by id with `fetchOne`, when the page doesn't hold it), the period `summary`, the shared `suppliers`; actions `fetchCategories`, `fetchPage`, `fetchOne`, `fetchSummary`, `fetchSuppliers`, `createSupplier`, `fetchForExport`, `create`, `update`, `cancel`.
- Form: `expense-form.vue` with `expense-supplier-field.vue` (search, pick, or create a Supplier inline: the Expense being typed stays), `expense-documents.vue` (the global `ui-drop-zone`: drop, pick, or take a photo), autosave through `use-expense-autosave.ts`; `expense-draft-banner.vue` offers « Reprendre » after a reload.
- Composables: `expense-amounts.ts` (TVA split, `summarizeExpenses`, `resultOf`, `groupCategories`, `categoryIdOf`), `expense-warnings.ts` (what the accountant will flag).
- Service: `ExpenseService`, on its mock until `expense` joins `VITE_API_MODULES`; the API class already names the endpoints (`/sites/{id}/expenses` (paged by offset and limit), `/summary`, `/suppliers`, `/export`, `/expenses/{id}` (read and update), `/expenses/{id}/cancel`, `/expense-categories`, `/suppliers` (list and create)).

## How to reuse
```ts
const expenseStore = useExpenseStore();
await expenseStore.fetchSummary(siteId, 'season');
const result = resultOf(revenue, expenseStore.summary!);
```

## Rules and gotchas
- An Expense points at a **sub-category** only; its category comes from the sub-category's `parentId`. Category ids are slugs, also the locale keys (`expense.categories.<id>`).
- `amount` is TTC. `vatRate` is 20, 10, 0 (exempt) or `null` (outside TVA): 14 % and 7 % no longer exist in 2026.
- Cancelled Expenses stay in the register, struck through, and out of every total. A closed Season (dates before `SEASON_START` in the mock) can't be changed.
- Warnings never block: the money is already spent.
- The right is `expense.record` (« Gérer les charges »), given by default to Management and the Accountant; the Result follows `finance.view`.
- The draft of an unsaved Expense lives in localStorage (`oleoziza.expense-draft.v1:<user>:<site>`, through `global/composables/storage.ts`), on purpose: it must survive a closed tab or a power cut. It holds business figures, never anything that authenticates. When documents don't fit, the draft keeps the rest and the form says so.
