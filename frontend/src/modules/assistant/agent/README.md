# Assistant

## Business
The [Assistant](../../../../../GLOSSARY.md#ai) docked at the bottom of the Management [Home](../../../../../GLOSSARY.md): Management asks in French, Arabic or Darija, typed or dictated, and reads streamed answers built from the app's own components. Questions form the User's private [Conversations](../../../../../GLOSSARY.md#ai). Backend contract: `backend/modules/assistant/agent/README.md`.

## Exposes
- Standalone `assistant-chat.vue` (lazy in `dashboard/components/management-home.vue`): the fixed composer on every tab; `v-model:is-active` tells the Home to recede its tabs while a Conversation shows. It sends the Home's Site (none for « Tous les sites ») and period with each question.
- `assistant-composer.vue` (full-width dock bar above the bottom nav and keyboard; « Nouvelle conversation » beside « Conversations » once a thread is open, icon-only on phones; mic, send), `assistant-recorder.vue` (tap to record, `ui-waveform`, timer, cancel; « Relire » puts the transcript in the field to edit, ↑ transcribes and sends at once; the 60 s cap ends as « Relire »), `assistant-history.vue` (the history list: grouped Today / Yesterday / 7 days / Earlier, `PAGE_SIZE` (10) per page with `ui-load-more`, delete one in place), `ui-confirm-button` to delete one or clear all), `assistant-message.vue` (question bubble with « Modifier » to put it back in the composer (↑ in an empty composer does the same for the last one), `ui-shimmer-text` stage lines naming what is read, word-by-word text with a caret, skeletons for planned blocks, choices, retry and reconnect, copy, « Utile » / « À revoir » and the scope on every answered turn, `assistant-method.vue` (« Comment c’est calculé », a `ui-disclosure` worded by `composables/answer-method.ts`), and the last answer's « Pour aller plus loin » follow-ups that ask at once), `assistant-block.vue` (`number` → `ui-stat-tile` with its comparison, `bar_chart` → `ui-bar-chart`, `table` → `ui-table`, `cards` → `assistant-record` opening the Lot or Client).
- `useAssistantStore`: questions, streamed answers, paged history, per-request status, dictation. Components never call the service.
- `services/assistant.ts`: API (SSE over `fetch` with the Bearer token, refresh on 401) or mock (`assistant.mock.ts` plays a realistic stream from `constants/mock-answers.ts`).

## Rules and gotchas
- New conversation keeps the history; delete one and clear all confirm in place and patch the loaded list.
- A pending answer blocks follow-ups. New, open and clear bump `generation`, abort the stream and drop late answers; events of another `attemptCursor` are refused.
- The draft's `requestId` (the question id) is renewed when the text changes, so a retry after a lost response sends the same id.
- Reconnects with `Last-Event-ID` (3 tries); a dropped stream first checks the saved answer.
- Follows new output only near the bottom, else a « Dernière réponse » pill. Every motion has a reduced-motion fallback.
- Offline: composer and mic disabled with « L'assistant a besoin du réseau ».
- Values are formatted with the app's own helpers (`composables/answer-format.ts`): DH, L, kg, days, dates; column and enum labels come from `assistant.columns` and `assistant.values`.
- The iPhone home-screen app asks for the microphone again after a cold start (WebKit); the denied line says how to allow it.
- Motion: a question shows at once (optimistic, its id is the request id the backend keeps) and grows out of its own bottom corner (`bubble-pop`); the send arrow lifts off; the answer under a question asked on this screen arrives as it lands (`isFresh`), a reopened Conversation does not replay it; stage lines cross-fade; streamed words come into focus one by one (blur on desktop, opacity only on phones); blocks settle in with a 70 ms stagger; actions, method and follow-ups settle last. `use-chat-scroll` glides to the newest content each frame and lets go as soon as the reader wheels, swipes or presses ↑.
- The scope line under an answer shows its Sites and the dates it really covers (`describeAnswerRange`), never the Home period the question may have overridden.
- View: `/assistant` (`assistant-history`, `meta.isManagementOnly`, parent the Home) → `views/history.vue`: every Conversation as a page, « Nouvelle conversation » and « Tout effacer ». Opening one goes to the Home with `?conversation=<id>` (`constants/routes.ts`; `new` starts a fresh one); the chat keeps that query in step with the open Conversation, so a reload or a shared link reopens it.
