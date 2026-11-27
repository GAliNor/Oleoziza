from dataclasses import dataclass
import json
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import AiProviderError, RefusedError, SecretBoxError
from core.integrations.fernet.fernet_client import SecretBox, get_secret_box
from core.integrations.openai_chat.openai_chat_client import ChatAnswer, ChatRequest, OpenAiChatClient, get_openai_chat_client
from modules.ai.business.ai_pricing import TokenUsage, compute_cost, estimate_cost, get_budget_month_bounds, is_over_budget
from modules.ai.business.ai_queries import get_feature_setting, lock_provider, sum_month_spend_by_provider
from modules.ai.helpers.ai_mappers import build_call_prices, build_model_prices, build_provider_extra_body
from modules.ai.models.ai_models import AiCall, AiCallPayload, AiModel, AiProvider
from modules.ai.types.ai_types import (
    FEATURE_API_STYLES,
    FEATURE_NEEDS_STRUCTURED_OUTPUT,
    AiApiStyle,
    AiCallStatus,
    AiFeature,
    StructuredCallResult,
)


@dataclass(frozen=True)
class StructuredPrompt:
    system_prompt: str
    user_prompt: str
    schema_name: str
    json_schema: dict[str, Any]
    max_output_tokens: int


@dataclass(frozen=True)
class CallContext:
    feature: AiFeature
    user_id: UUID | None
    record_type: str | None
    record_id: UUID | None


class AiCallService:
    def __init__(self, db: Session, secret_box: SecretBox, chat_client: OpenAiChatClient) -> None:
        """
        Run AI calls for AI features: check the key's AI budget, reserve, call the provider, then record the cost on the usage ledger.

        Args:
            db (Session): Database session; this service commits the ledger around the provider call.
            secret_box (SecretBox): Opens provider keys.
            chat_client (OpenAiChatClient): OpenAI-compatible chat client.
        """
        self.db = db
        self.secret_box = secret_box
        self.chat_client = chat_client

    def run_structured(self, context: CallContext, prompt: StructuredPrompt) -> StructuredCallResult:
        """
        Ask the AI feature's model for one strict-JSON answer, refusing before any call when the feature is not ready or the key's AI budget
        would be passed; the call is on the ledger whatever happens.

        Args:
            context (CallContext): Which AI feature, for whom and for which record.
            prompt (StructuredPrompt): Prompts, schema and output limit.

        Returns:
            StructuredCallResult: The JSON answer, its ledger id and cost.

        Raises:
            RefusedError: ai_feature_not_configured, ai_provider_key_missing, ai_model_unsupported, ai_budget_exceeded (409), or the provider's
                failure code (502).
        """
        model, provider = self._get_feature_model(context.feature)
        return self.run_with_model(context, prompt, model, provider, None)

    def run_with_model(self, context: CallContext, prompt: StructuredPrompt, model: AiModel, provider: AiProvider, api_key: str | None) -> StructuredCallResult:
        """
        Run one strict-JSON call on a given model, with the provider's stored key or a key being tested.

        Args:
            context (CallContext): Which AI feature, for whom and for which record.
            prompt (StructuredPrompt): Prompts, schema and output limit.
            model (AiModel): Model to call.
            provider (AiProvider): Its provider.
            api_key (str | None): A key under test, or None to use the stored one.

        Returns:
            StructuredCallResult: The JSON answer, its ledger id and cost.

        Raises:
            RefusedError: ai_provider_key_missing, ai_budget_exceeded, ai_secrets_key_missing or the provider's failure code.
        """
        if provider.api_style != AiApiStyle.OPENAI_CHAT:
            raise RefusedError("ai_model_unsupported", 409)
        key = api_key or self._open_key(provider)
        call = self._reserve(context, prompt, model, provider.id)
        request = ChatRequest(
            base_url=provider.base_url,
            api_key=key,
            model=model.name,
            system_prompt=prompt.system_prompt,
            user_prompt=prompt.user_prompt,
            schema_name=prompt.schema_name,
            json_schema=prompt.json_schema,
            max_output_tokens=prompt.max_output_tokens,
            extra_body=build_provider_extra_body(provider.kind),
        )
        try:
            answer = self.chat_client.complete_json(request)
        except AiProviderError as error:
            self._record_failure(call, error)
            raise RefusedError(error.code, 502) from error
        cost = self._record_success(call, answer, context.feature, prompt)
        return StructuredCallResult(call_id=call.id, content=answer.content, cost_usd=cost, model_name=model.name)

    def _get_feature_model(self, feature: AiFeature) -> tuple[AiModel, AiProvider]:
        """
        Load the model an AI feature is set to use, and check it can serve the feature.

        Args:
            feature (AiFeature): AI feature.

        Returns:
            tuple[AiModel, AiProvider]: The model and its provider.

        Raises:
            RefusedError: ai_feature_not_configured or ai_model_unsupported.
        """
        setting = get_feature_setting(self.db, feature)
        model = self.db.get(AiModel, setting.model_id) if setting and setting.model_id else None
        if model is None or model.is_archived:
            raise RefusedError("ai_feature_not_configured", 409)
        provider = self.db.get(AiProvider, model.provider_id)
        if provider is None:
            raise RefusedError("ai_feature_not_configured", 409)
        validate_model_for_feature(feature, model, provider)
        return model, provider

    def _open_key(self, provider: AiProvider) -> str:
        """
        Decrypt the provider's stored key.

        Args:
            provider (AiProvider): Provider.

        Returns:
            str: Plain key.

        Raises:
            RefusedError: ai_provider_key_missing, ai_secrets_key_missing or ai_secret_unreadable.
        """
        if provider.sealed_key is None:
            raise RefusedError("ai_provider_key_missing", 409)
        try:
            return self.secret_box.open(provider.sealed_key)
        except SecretBoxError as error:
            raise RefusedError(error.code, 409) from error

    def _reserve(self, context: CallContext, prompt: StructuredPrompt, model: AiModel, provider_id: UUID) -> AiCall:
        """
        Lock the key's provider row, check the month's AI budget against the call's estimate, and commit a reserved ledger row; a call the budget
        refuses is committed as refused.

        Args:
            context (CallContext): Which AI feature, for whom and for which record.
            prompt (StructuredPrompt): Prompts and output limit, for the estimate.
            model (AiModel): Model called.
            provider_id (UUID): Its provider.

        Returns:
            AiCall: The committed reserved row.

        Raises:
            RefusedError: ai_budget_exceeded (409) with the budget, what is spent and the estimate.
        """
        schema_text = json.dumps(prompt.json_schema, ensure_ascii=False, separators=(",", ":"))
        estimate = estimate_cost(build_model_prices(model), prompt.system_prompt + prompt.user_prompt + schema_text, prompt.max_output_tokens)
        return self._reserve_estimate(context, model, provider_id, estimate)

    def _reserve_estimate(self, context: CallContext, model: AiModel, provider_id: UUID, estimate: Decimal) -> AiCall:
        """
        Lock the key's provider row, check the month's AI budget against an estimate, and commit a reserved ledger row; a call the budget
        refuses is committed as refused.

        Args:
            context (CallContext): Which AI feature, for whom and for which record.
            model (AiModel): Model called.
            provider_id (UUID): Its provider.
            estimate (Decimal): Most the call can cost, in USD.

        Returns:
            AiCall: The committed reserved row.

        Raises:
            RefusedError: ai_budget_exceeded (409) with the budget, what is spent and the estimate.
        """
        prices = build_model_prices(model)
        provider = lock_provider(self.db, provider_id)
        if provider is None:
            self.db.rollback()
            raise RefusedError("ai_feature_not_configured", 409)
        start, end = get_budget_month_bounds(datetime.now(UTC))
        spent, reserved = sum_month_spend_by_provider(self.db, start, end).get(provider_id, (Decimal("0"), Decimal("0")))
        is_refused = is_over_budget(provider.monthly_budget_usd, spent + reserved, estimate)
        call = AiCall(
            feature=context.feature,
            user_id=context.user_id,
            record_type=context.record_type,
            record_id=context.record_id,
            provider_id=provider_id,
            model_id=model.id,
            model_name=model.name,
            status=AiCallStatus.REFUSED if is_refused else AiCallStatus.RESERVED,
            input_price_per_million=prices.input_per_million,
            cached_input_price_per_million=prices.cached_input_per_million,
            output_price_per_million=prices.output_per_million,
            reserved_cost_usd=estimate,
            error_code="ai_budget_exceeded" if is_refused else None,
            finished_at=datetime.now(UTC) if is_refused else None,
        )
        self.db.add(call)
        self.db.commit()
        if is_refused:
            details = {"budgetUsd": float(provider.monthly_budget_usd), "spentUsd": float(spent + reserved), "estimateUsd": float(estimate)}
            raise RefusedError("ai_budget_exceeded", 409, details)
        return call

    def _record_failure(self, call: AiCall, error: AiProviderError) -> None:
        """
        Close a reserved row as failed, releasing its reservation.

        Args:
            call (AiCall): Reserved row.
            error (AiProviderError): What the provider did.
        """
        call.status = AiCallStatus.FAILED
        call.error_code = error.code
        call.error_detail = error.detail[:2000] or None
        call.finished_at = datetime.now(UTC)
        self.db.commit()

    def _record_success(self, call: AiCall, answer: ChatAnswer, feature: AiFeature, prompt: StructuredPrompt) -> Decimal:
        """
        Close a reserved row with its real tokens and cost (the provider's own figure when it gives one), and keep the exchange when the AI
        feature keeps payloads.

        Args:
            call (AiCall): Reserved row.
            answer (ChatAnswer): The provider's answer.
            feature (AiFeature): AI feature, for its retention.
            prompt (StructuredPrompt): What was sent.

        Returns:
            Decimal: The call's cost in USD.
        """
        usage = TokenUsage(answer.input_tokens, answer.cached_input_tokens, answer.output_tokens)
        cost = Decimal(str(answer.reported_cost_usd)) if answer.reported_cost_usd is not None else compute_cost(build_call_prices(call), usage)
        call.status = AiCallStatus.SUCCEEDED
        call.input_tokens = answer.input_tokens
        call.cached_input_tokens = answer.cached_input_tokens
        call.output_tokens = answer.output_tokens
        call.cost_usd = cost
        call.duration_in_milliseconds = answer.duration_in_milliseconds
        call.finished_at = datetime.now(UTC)
        retention_days = self._get_retention_days(feature)
        if retention_days:
            self.db.add(
                AiCallPayload(
                    call_id=call.id,
                    request={"system": prompt.system_prompt, "user": prompt.user_prompt, "schemaName": prompt.schema_name},
                    response=answer.content,
                    purge_after=date.today() + timedelta(days=retention_days),
                )
            )
        self.db.commit()
        return cost

    def _get_retention_days(self, feature: AiFeature) -> int | None:
        """
        Read how many days an AI feature keeps its requests and responses.

        Args:
            feature (AiFeature): AI feature.

        Returns:
            int | None: Days kept, or None when nothing is kept.
        """
        setting = get_feature_setting(self.db, feature)
        return setting.payload_retention_days if setting else None


def validate_model_for_feature(feature: AiFeature, model: AiModel, provider: AiProvider) -> None:
    """
    Refuse a model an AI feature has no playbook for: a provider calling style it does not speak, or no strict JSON when it needs it.

    Args:
        feature (AiFeature): AI feature.
        model (AiModel): Model chosen.
        provider (AiProvider): Its provider.

    Raises:
        RefusedError: ai_model_unsupported (422).
    """
    if provider.api_style not in FEATURE_API_STYLES.get(feature, ()):
        raise RefusedError("ai_model_unsupported", 422)
    if FEATURE_NEEDS_STRUCTURED_OUTPUT.get(feature, False) and not model.supports_structured_output:
        raise RefusedError("ai_model_unsupported", 422)


def get_ai_call_service(
    db: Session = Depends(get_db),
    secret_box: SecretBox = Depends(get_secret_box),
    chat_client: OpenAiChatClient = Depends(get_openai_chat_client),
) -> AiCallService:
    """
    Build the AI call service for a request.

    Args:
        db (Session): Request database session.
        secret_box (SecretBox): Secret box.
        chat_client (OpenAiChatClient): Chat client.

    Returns:
        AiCallService: Service bound to the session.
    """
    return AiCallService(db, secret_box, chat_client)
