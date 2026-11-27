# AI

## Business
The Owners' settings and monitoring of the AI behind the [Assistant](../../../../../GLOSSARY.md#ai): the provider key, the models per AI Feature, the monthly [AI Budget](../../../../../GLOSSARY.md#ai) and each month's usage. Backend: `backend/modules/ai/agent/README.md`.

## Exposes
- View: `/configuration/ai` (name `ai`, `meta.isOwnerOnly`, parent `configuration`) → `views/entry.vue`, reached from the Configuration hub card. Tabs in `?tab=`:
  - `monitoring` (default) → `ai-monitoring-tab.vue`: month navigation, `ui-stat-tile`s (spent against the budget, calls with the average cost, budget left with what in-flight calls reserve), totals per AI Feature and per User, and `ai-calls.vue` (every call of the month filtered by AI Feature, `PAGE_SIZE` per page with `ui-load-more`: date, User, model, tokens, duration, cost, state, problem).
  - `access` → `ai-access-tab.vue`: the provider key (tested before it is saved, only its last four characters shown back) and the monthly budget.
  - `models` → `ai-models-tab.vue`: the model of each AI Feature (`ui-select`, tested by the backend before it is chosen; chat and transcription models never mix), a test button, and the model catalogue with its prices.
- `useAiStore`: `fetchSettings`, `fetchUsage(isMore)`, `shiftMonth`, `filterFeature`, `saveKey`, `removeKey`, `saveBudget`, `saveFeatureModel`, `testModel`; getters `provider`, `isCurrentMonth`.
- Composables: `ai-format.ts` (`formatUsd`, `formatMonth`), `ai-errors.ts` (`describeAiError`, reusing `assistant.errors.*`).

## Rules and gotchas
- Without `AI_SECRETS_KEY` on the server the key is locked and the page says so. The development env carries a development-only key; production sets its own.
- Usage shows counts, durations and costs per User, never the questions.
- The router refuses `meta.isOwnerOnly` routes to anyone but an Owner.
