# Dashboard

## Business
The [Home](../../../../../GLOSSARY.md) of each Workspace: the Management Home (Overview, Production and Finances tabs over a shared period) and the Operator Home.

## Exposes
- View: `/` → `views/entry.vue`: `management-home.vue` for the Backoffice view, `operator-home.vue` for the Operator view.
- Store: `useDashboardStore.fetchDashboard(siteId, period)`: the Home in one request; its sales and Expense summary fill the finance and expense stores.

## Rules and gotchas
- The Management Home mounts the [Assistant](../../assistant/agent/README.md) (`assistant-chat`, lazy). While a Conversation is active the tabs and their content recede (`v-show`, so their state survives) and the chat takes their place; the dock stays on every tab. The section keeps bottom room for the dock.
