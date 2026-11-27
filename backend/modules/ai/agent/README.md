# AI

## Business
The foundation every [AI Feature](../../../../GLOSSARY.md#ai) runs on: the provider account and its encrypted key, a priced model list, which model each AI Feature uses, the usage ledger (who, which feature, which record, tokens, cost, outcome) and the monthly [AI Budget](../../../../GLOSSARY.md#ai) of each key. Only an [Owner](../../../../GLOSSARY.md) reads or changes it. Ported from mv's `ai` module (Owners instead of a Tech admin, UUID ids, no image features).

## Exposes
- `GET /api/ai/settings`, `POST /providers`, `PUT /providers/{id}`, `PUT|DELETE /providers/{id}/key` (a key is saved only after a test call passes), `PUT /providers/{id}/budget`, `POST /models`, `PUT /models/{id}`, `POST /models/{id}/test`, `PUT /features/{feature}`, `GET /api/ai/usage?month=YYYY-MM&feature=&userId=`. All gated by `core.security.get_current_owner`.
- Services: `AiCallService.run_structured(context, prompt)` is the only way an AI Feature calls a chat model (budget check under a provider row lock, a committed `reserved` ledger row, the call, then `succeeded`/`failed`/`refused`); `AiTranscriptionService.run_transcription` does the same for audio.
- Tasks: `ai.purge_expired_payloads`, every 6 h through the worker's embedded beat.

## Refusal codes
`owner_only` (403), `ai_budget_exceeded` (409, with `budgetUsd`, `spentUsd`, `estimateUsd`), `ai_feature_not_configured`, `ai_provider_key_missing`, `ai_model_unsupported`, `ai_secrets_key_missing`, `ai_secret_unreadable`, `ai_model_in_use`, `ai_model_taken`, `ai_provider_label_taken`, `ai_provider_not_found`, `ai_model_not_found`, `ai_feature_not_found` (404), `ai_month_invalid`; provider failures: `ai_provider_unreachable`, `ai_provider_timeout`, `ai_provider_rejected_key`, `ai_provider_refused`, `ai_provider_bad_answer`.

## Rules and gotchas
- AI Features: `assistant` (`gpt-6-luna`) and `assistant_transcription` (`gpt-transcribe`, $0.0045 per minute, model row priced 0 per token); `connection_test` only for tests. The reference seed adds the OpenAI provider, both models and both settings when missing, never overwriting an Owner's key or choices.
- Keys are sealed with Fernet (`AI_SECRETS_KEY`); the API shows only `hasKey` and the last four characters. Without the env key nothing can be stored (`hasSecretsKey: false`). Rotating it means re-sealing `ai_providers.sealed_key`.
- A transcription model is not chat-tested (`is_transcription_model`); a test on it passes without a call.
- Payloads (request and response) are kept `payload_retention_days` (30 by default) for debugging from the database only: no endpoint shows them, because Owners never see questions (map Q17). They are a frozen JSON snapshot, exempt from the no-lists rule.
- Settings changes record Audit Events `ai.<action>` with no key and no text.
- The usage ledger and settings are kept by every data reset.
