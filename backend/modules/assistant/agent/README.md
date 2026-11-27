# Assistant

## Business
The [Assistant](../../../../GLOSSARY.md#ai): Management asks about the mill in French, Arabic or Darija, typed or dictated, and gets answers computed from the app's data within the Sites and Permissions they hold. Questions form the User's private [Conversations](../../../../GLOSSARY.md#ai). Decisions: [the map](../../../../.wayfinder/map-assistant.md) and [the brief](../../../../.wayfinder/briefs/assistant.md).

## Exposes
- `POST /api/assistant/questions` (`text`, `conversationId`, `requestId` = the question id minted by the front, `siteId`, `period`), `POST /questions/{id}/choice|retry`, `PUT /questions/{id}/feedback`, `GET /questions/{id}/events` (SSE, async, no DB session), `POST /transcriptions` (multipart `audio`, `durationInSeconds` ≤ 60), `GET|DELETE /conversations`, `GET|DELETE /conversations/{id}`. All gated by the Management Role (`get_current_manager`), an exception to A1 recorded as D20.
- Task: `assistant.answer_question` on the `assistant` queue (its own worker, `oleoziza_assistant_worker`), `acks_late=False`, soft 60 s.

## Refusal codes
`management_only` (403), `assistant_question_empty`, `assistant_request_conflict`, `assistant_answer_pending`, `assistant_choice_invalid`, `assistant_retry_unavailable`, `assistant_question_not_found`, `assistant_conversation_not_found` (404), `assistant_audio_invalid` (422), `site_forbidden`, `site_not_found`. Saved on a failed question (`errorCode`): `assistant_plan_invalid`, `assistant_failed`, `assistant_timeout`, `assistant_queue_unavailable`, and the AI module's codes.

## How an answer is made
1. `ask` freezes the scope on the question: Sites from `resolve_site_ids` (the Home's Site or every Site held), the Home period, and `canSeeMoney` = finance-view on every one of them (D4).
2. The worker makes one strict-JSON model call (`helpers/assistant_playbook.py`: short general rules + the catalogue generated from the semantic layer, cached as the prompt prefix). The plan holds queries q1..q4, calcs c1..c2, blocks, an optional `next` and up to 3 `suggestions` (follow-up questions in the asker's language; on `clarify`, the closest answerable ones). An invalid plan gets one retry with the reason.
3. When `next` is set, round one runs, and only a digest (≤ 10 rows × 8 columns, text cut at 60 characters) goes back for one final call. At most two calls per question.
4. `business/plan_rules.py` freezes periods into date filters (default: the Home period on the entity's date field), and checks references, bindings and that every query compiles. `business/plan_runner.py` runs the queries in one read-only transaction (statement timeout 5 s): `{qN.column}` references, `compare` (previous period or previous Season over as many days) and calcs (`difference`, `ratio` in percent, `days_between`). Rows never reach the model outside the digest.
5. The answer is saved (compare-and-set on the attempt cursor), then streamed: `stage` (understanding → searching with entities → deepening → writing), `plan` (planned block types for skeletons), `message.delta` (three words at a time), `block`, `choices`, `done`; or `error`.

## Rules and gotchas
- The semantic layer (`business/semantic_*`) is the only way to data: nine entities, names declared in code, values bound, every query limited by `site_id = ANY(:scope_site_ids)`. CIN, ICE, phones, PINs, Login Methods and the Audit Trail are not in it.
- Money measures repeat the fee rules of `finance` as per-Lot SQL. `tests/modules/assistant/test_assistant_semantic_layer.py` pins them to `FinanceDeskService.get_sales` and `list_client_debts`: change both together.
- A name that is both a field and a measure (`outstanding`) is the measure in a grouped query (HAVING), else the field.
- A money query without finance-view answers a fixed notice in the asker's language, never figures.
- Questions are ordered by `created_at` (the front mints v4 ids).
- The saved answer carries `suggestions` (deduplicated, never the question itself; `helpers/answer_method.py`) and, for `answer`, a `method`: the final plan's entities, measures, grouping, filters (the period already turned into exact date filters), compare and calcs, so the screen can say how a figure was calculated.
- Scope, plan and answer are frozen JSON snapshots, exempt from the no-lists rule; a reopened answer is never recomputed.
- Conversation writes record no Audit Event (private notes); deleting a User deletes their Conversations.
- The synthetic corpus (`tests/modules/assistant/fixtures/question-corpus.json`, 36 questions in fr, ar, Darija Latin and Arabic script) runs every expected plan against fixture data. Real questions from Dr Taibi will extend it; live model scoring needs a key.
- Reset: `python -m resets apply assistant` empties Conversations only.
