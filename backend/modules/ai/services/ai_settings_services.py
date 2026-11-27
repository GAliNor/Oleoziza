from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError, SecretBoxError
from core.integrations.fernet.fernet_client import SecretBox, get_secret_box
from core.integrations.openai_chat.openai_chat_client import OpenAiChatClient, get_openai_chat_client
from core.types import CurrentUser
from modules.ai.business.ai_pricing import get_budget_month_bounds
from modules.audit.business.audit_events import record_audit_event
from modules.ai.business.ai_queries import list_feature_settings, list_models, list_providers, sum_month_spend_by_provider
from modules.ai.helpers.ai_mappers import map_feature_setting, map_model, map_provider
from modules.ai.models.ai_models import AiFeatureSetting, AiModel, AiProvider
from modules.ai.services.ai_call_services import AiCallService, CallContext, StructuredPrompt, validate_model_for_feature
from modules.ai.types.ai_types import (
    AI_PROVIDER_ENTITY_TYPE,
    AI_FEATURE_ENTITY_TYPE,
    AI_MODEL_ENTITY_TYPE,
    CONFIGURABLE_FEATURES,
    CONNECTION_TEST_MAX_OUTPUT_TOKENS,
    AiConnectionTestOut,
    AiFeature,
    AiFeatureSettingIn,
    AiFeatureSettingOut,
    AiModelIn,
    AiModelOut,
    AiModelUpdateIn,
    AiProviderBudgetIn,
    AiProviderIn,
    AiProviderKeyIn,
    AiProviderOut,
    AiSettingsOut,
)


CONNECTION_TEST_PROMPT = StructuredPrompt(
    system_prompt="You check that an API connection works. Answer with the JSON asked.",
    user_prompt='Answer {"ok": true}.',
    schema_name="connection_test",
    json_schema={"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"], "additionalProperties": False},
    max_output_tokens=CONNECTION_TEST_MAX_OUTPUT_TOKENS,
)


class AiSettingsService:
    def __init__(self, db: Session, secret_box: SecretBox, call_service: AiCallService) -> None:
        """
        Manage what the Owner sets: providers and their keys, the model list and prices, the AI budget per key, and each AI feature's model.

        Args:
            db (Session): Database session.
            secret_box (SecretBox): Seals provider keys.
            call_service (AiCallService): Runs connection tests.
        """
        self.db = db
        self.secret_box = secret_box
        self.call_service = call_service

    def get_settings(self) -> AiSettingsOut:
        """
        Load everything the "Paramètres > IA" page shows, keys masked.

        Returns:
            AiSettingsOut: Providers with this month's spend, models, AI feature settings, and whether a master key is configured.
        """
        start, end = get_budget_month_bounds(datetime.now(UTC))
        spend = sum_month_spend_by_provider(self.db, start, end)
        settings_by_feature = list_feature_settings(self.db)
        return AiSettingsOut(
            providers=[map_provider(provider, sum(spend.get(provider.id, (Decimal("0"), Decimal("0"))))) for provider in list_providers(self.db)],
            models=[map_model(model) for model in list_models(self.db)],
            features=[map_feature_setting(feature, settings_by_feature.get(feature)) for feature in CONFIGURABLE_FEATURES],
            has_secrets_key=self._has_secrets_key(),
        )

    def create_provider(self, payload: AiProviderIn, current_user: CurrentUser) -> AiProviderOut:
        """
        Add a provider account, without a key yet.

        Args:
            payload (AiProviderIn): Kind, label, base URL and calling style.
            current_user (CurrentUser): The Owner.

        Returns:
            AiProviderOut: The new provider.

        Raises:
            RefusedError: ai_provider_label_taken (409).
        """
        provider = AiProvider(kind=payload.kind, label=payload.label.strip(), base_url=payload.base_url.strip(), api_style=payload.api_style, created_by_id=current_user.id, updated_by_id=current_user.id)
        self.db.add(provider)
        self._flush_unique("ai_provider_label_taken")
        self._log(AI_PROVIDER_ENTITY_TYPE, provider.id, "create", {"label": provider.label, "baseUrl": provider.base_url}, current_user.id)
        self.db.commit()
        return map_provider(provider, Decimal("0"))

    def update_provider(self, provider_id: UUID, payload: AiProviderIn, current_user: CurrentUser) -> AiProviderOut:
        """
        Change a provider's label, base URL or calling style; its key and budget stay.

        Args:
            provider_id (UUID): Provider id.
            payload (AiProviderIn): New values.
            current_user (CurrentUser): The Owner.

        Returns:
            AiProviderOut: The provider.

        Raises:
            RefusedError: ai_provider_not_found (404), ai_provider_label_taken (409).
        """
        provider = self._get_provider(provider_id)
        provider.kind = payload.kind
        provider.label = payload.label.strip()
        provider.base_url = payload.base_url.strip()
        provider.api_style = payload.api_style
        provider.updated_by_id = current_user.id
        self._flush_unique("ai_provider_label_taken")
        self._log(AI_PROVIDER_ENTITY_TYPE, provider.id, "update", {"label": provider.label, "baseUrl": provider.base_url, "apiStyle": provider.api_style.value}, current_user.id)
        self.db.commit()
        return self._map_provider(provider)

    def set_provider_key(self, provider_id: UUID, payload: AiProviderKeyIn, current_user: CurrentUser) -> AiProviderOut:
        """
        Test a new key with one of the provider's models, then store it encrypted; a key that fails the test is not saved.

        Args:
            provider_id (UUID): Provider id.
            payload (AiProviderKeyIn): The key and the model to test it with.
            current_user (CurrentUser): The Owner.

        Returns:
            AiProviderOut: The provider, key masked.

        Raises:
            RefusedError: ai_provider_not_found, ai_model_not_found, ai_secrets_key_missing, ai_budget_exceeded, or the provider's failure code (422).
        """
        provider = self._get_provider(provider_id)
        model = self._get_model(payload.test_model_id)
        if model.provider_id != provider.id:
            raise RefusedError("ai_model_not_found", 404)
        api_key = payload.api_key.strip()
        self._seal(api_key)
        self._test(model, provider, api_key, current_user.id)
        provider = self._get_provider(provider_id)
        provider.sealed_key = self._seal(api_key)
        provider.key_last_four = api_key[-4:]
        provider.updated_by_id = current_user.id
        self._log(AI_PROVIDER_ENTITY_TYPE, provider.id, "key_set", {"keyLastFour": provider.key_last_four}, current_user.id)
        self.db.commit()
        return self._map_provider(provider)

    def remove_provider_key(self, provider_id: UUID, current_user: CurrentUser) -> AiProviderOut:
        """
        Forget a provider's key; AI features using it stop until a key is set again.

        Args:
            provider_id (UUID): Provider id.
            current_user (CurrentUser): The Owner.

        Returns:
            AiProviderOut: The provider, without a key.

        Raises:
            RefusedError: ai_provider_not_found (404).
        """
        provider = self._get_provider(provider_id)
        provider.sealed_key = None
        provider.key_last_four = None
        provider.updated_by_id = current_user.id
        self._log(AI_PROVIDER_ENTITY_TYPE, provider.id, "key_removed", {}, current_user.id)
        self.db.commit()
        return self._map_provider(provider)

    def set_provider_budget(self, provider_id: UUID, payload: AiProviderBudgetIn, current_user: CurrentUser) -> AiProviderOut:
        """
        Set the monthly AI budget of a provider's key.

        Args:
            provider_id (UUID): Provider id.
            payload (AiProviderBudgetIn): Budget in USD.
            current_user (CurrentUser): The Owner.

        Returns:
            AiProviderOut: The provider.

        Raises:
            RefusedError: ai_provider_not_found (404).
        """
        provider = self._get_provider(provider_id)
        before = float(provider.monthly_budget_usd)
        provider.monthly_budget_usd = payload.monthly_budget_usd
        provider.updated_by_id = current_user.id
        self._log(AI_PROVIDER_ENTITY_TYPE, provider.id, "budget", {"before": before, "after": float(payload.monthly_budget_usd)}, current_user.id)
        self.db.commit()
        return self._map_provider(provider)

    def create_model(self, payload: AiModelIn, current_user: CurrentUser) -> AiModelOut:
        """
        Add a model to the model list with its prices.

        Args:
            payload (AiModelIn): Provider, model id and prices.
            current_user (CurrentUser): The Owner.

        Returns:
            AiModelOut: The new model.

        Raises:
            RefusedError: ai_provider_not_found (404), ai_model_taken (409).
        """
        self._get_provider(payload.provider_id)
        model = AiModel(
            provider_id=payload.provider_id,
            name=payload.name.strip(),
            input_price_per_million=payload.input_price_per_million,
            cached_input_price_per_million=payload.cached_input_price_per_million,
            output_price_per_million=payload.output_price_per_million,
            supports_structured_output=payload.supports_structured_output,
            created_by_id=current_user.id,
            updated_by_id=current_user.id,
        )
        self.db.add(model)
        self._flush_unique("ai_model_taken")
        self._log(AI_MODEL_ENTITY_TYPE, model.id, "model_create", payload.model_dump(mode="json", by_alias=True), current_user.id)
        self.db.commit()
        return map_model(model)

    def update_model(self, model_id: UUID, payload: AiModelUpdateIn, current_user: CurrentUser) -> AiModelOut:
        """
        Change a model's prices, structured-output support or archive it; calls already made keep the prices frozen on them.

        Args:
            model_id (UUID): Model id.
            payload (AiModelUpdateIn): New values.
            current_user (CurrentUser): The Owner.

        Returns:
            AiModelOut: The model.

        Raises:
            RefusedError: ai_model_not_found (404), ai_model_in_use (409) when archiving a model an AI feature uses.
        """
        model = self._get_model(model_id)
        if payload.is_archived and any(setting.model_id == model.id for setting in list_feature_settings(self.db).values()):
            raise RefusedError("ai_model_in_use", 409)
        model.input_price_per_million = payload.input_price_per_million
        model.cached_input_price_per_million = payload.cached_input_price_per_million
        model.output_price_per_million = payload.output_price_per_million
        model.supports_structured_output = payload.supports_structured_output
        model.is_archived = payload.is_archived
        model.updated_by_id = current_user.id
        self._log(AI_MODEL_ENTITY_TYPE, model.id, "model_update", payload.model_dump(mode="json", by_alias=True), current_user.id)
        self.db.commit()
        return map_model(model)

    def set_feature(self, feature: AiFeature, payload: AiFeatureSettingIn, current_user: CurrentUser) -> AiFeatureSettingOut:
        """
        Point an AI feature at a model after a successful test call, and set how long it keeps requests and responses; it takes effect on the
        next call.

        Args:
            feature (AiFeature): AI feature.
            payload (AiFeatureSettingIn): Model and retention.
            current_user (CurrentUser): The Owner.

        Returns:
            AiFeatureSettingOut: The saved setting.

        Raises:
            RefusedError: ai_feature_not_found (404), ai_model_not_found, ai_model_unsupported, ai_provider_key_missing, or the test's failure (422).
        """
        if feature not in CONFIGURABLE_FEATURES:
            raise RefusedError("ai_feature_not_found", 404)
        model = self._get_model(payload.model_id)
        provider = self._get_provider(model.provider_id)
        if model.is_archived:
            raise RefusedError("ai_model_not_found", 404)
        validate_model_for_feature(feature, model, provider)
        self._test(model, provider, None, current_user.id, feature)
        setting = self.db.get(AiFeatureSetting, feature) or AiFeatureSetting(feature=feature, created_by_id=current_user.id)
        setting.model_id = model.id
        setting.payload_retention_days = payload.payload_retention_days
        setting.updated_by_id = current_user.id
        self.db.add(setting)
        self._log(AI_FEATURE_ENTITY_TYPE, model.id, "feature", {"feature": feature.value, "model": model.name, "payloadRetentionDays": payload.payload_retention_days}, current_user.id)
        self.db.commit()
        return map_feature_setting(feature, setting)

    def test_model(self, model_id: UUID, current_user: CurrentUser) -> AiConnectionTestOut:
        """
        Run a tiny test call on a model with its provider's stored key, recorded on the ledger as a connection test.

        Args:
            model_id (UUID): Model id.
            current_user (CurrentUser): The Owner.

        Returns:
            AiConnectionTestOut: Whether it worked, the failure code otherwise, and how long it took.
        """
        model = self._get_model(model_id)
        provider = self._get_provider(model.provider_id)
        started_at = datetime.now(UTC)
        try:
            self._test(model, provider, None, current_user.id)
        except RefusedError as error:
            return AiConnectionTestOut(is_ok=False, code=error.code, duration_in_milliseconds=None)
        return AiConnectionTestOut(is_ok=True, code=None, duration_in_milliseconds=int((datetime.now(UTC) - started_at).total_seconds() * 1000))

    def _test(self, model: AiModel, provider: AiProvider, api_key: str | None, user_id: UUID, feature: AiFeature | None = None) -> None:
        """
        Run the connection test; any failure is refused as unprocessable.

        Args:
            model (AiModel): Model tested.
            provider (AiProvider): Its provider.
            api_key (str | None): A key under test, or None for the stored one.
            user_id (UUID): The Owner.
            feature (AiFeature | None): Feature being configured, when available.

        Raises:
            RefusedError: The failure code (422).
        """
        context = CallContext(feature=AiFeature.CONNECTION_TEST, user_id=user_id, record_type=AI_PROVIDER_ENTITY_TYPE, record_id=provider.id)
        try:
            if not is_transcription_model(model.name) and feature != AiFeature.ASSISTANT_TRANSCRIPTION:
                self.call_service.run_with_model(context, CONNECTION_TEST_PROMPT, model, provider, api_key)
        except RefusedError as error:
            raise RefusedError(error.code, 422, error.details) from error

    def _seal(self, api_key: str) -> str:
        """
        Encrypt a key, refusing when no master key is configured.

        Args:
            api_key (str): Plain key.

        Returns:
            str: Sealed key.

        Raises:
            RefusedError: ai_secrets_key_missing (409).
        """
        try:
            return self.secret_box.seal(api_key)
        except SecretBoxError as error:
            raise RefusedError(error.code, 409) from error

    def _has_secrets_key(self) -> bool:
        """
        Tell whether the environment configures a master key.

        Returns:
            bool: True when keys can be stored.
        """
        try:
            self.secret_box.seal("probe")
        except SecretBoxError:
            return False
        return True

    def _map_provider(self, provider: AiProvider) -> AiProviderOut:
        """
        Show a provider with this month's spend on its key.

        Args:
            provider (AiProvider): Provider.

        Returns:
            AiProviderOut: The provider.
        """
        start, end = get_budget_month_bounds(datetime.now(UTC))
        return map_provider(provider, sum(sum_month_spend_by_provider(self.db, start, end).get(provider.id, (Decimal("0"), Decimal("0")))))

    def _get_provider(self, provider_id: UUID) -> AiProvider:
        """
        Load a provider.

        Args:
            provider_id (UUID): Provider id.

        Returns:
            AiProvider: The provider.

        Raises:
            RefusedError: ai_provider_not_found (404).
        """
        provider = self.db.get(AiProvider, provider_id)
        if provider is None:
            raise RefusedError("ai_provider_not_found", 404)
        return provider

    def _get_model(self, model_id: UUID) -> AiModel:
        """
        Load a model.

        Args:
            model_id (UUID): Model id.

        Returns:
            AiModel: The model.

        Raises:
            RefusedError: ai_model_not_found (404).
        """
        model = self.db.get(AiModel, model_id)
        if model is None:
            raise RefusedError("ai_model_not_found", 404)
        return model

    def _flush_unique(self, code: str) -> None:
        """
        Flush a write, turning a uniqueness violation into a refusal.

        Args:
            code (str): Refusal code when a unique value is taken.

        Raises:
            RefusedError: The code (409).
        """
        try:
            self.db.flush()
        except IntegrityError as error:
            self.db.rollback()
            raise RefusedError(code, 409) from error

    def _log(self, entity_type: str, entity_id: UUID, action: str, changes: dict[str, object], user_id: UUID) -> None:
        """
        Record an Audit Event for an AI setting change; a key is never recorded, only its last four characters.

        Args:
            entity_type (str): ai_provider, ai_model or ai_feature.
            entity_id (UUID): Row id.
            action (str): What happened, recorded as ai.<action>.
            changes (dict[str, object]): Values to keep.
            user_id (UUID): The Owner.
        """
        record_audit_event(self.db, user_id, f"ai.{action}", entity_type=entity_type, entity_id=entity_id, after=changes)


def get_ai_settings_service(
    db: Session = Depends(get_db),
    secret_box: SecretBox = Depends(get_secret_box),
    chat_client: OpenAiChatClient = Depends(get_openai_chat_client),
) -> AiSettingsService:
    """
    Build the AI settings service for a request.

    Args:
        db (Session): Request database session.
        secret_box (SecretBox): Secret box.
        chat_client (OpenAiChatClient): Chat client for connection tests.

    Returns:
        AiSettingsService: Service bound to the session.
    """
    return AiSettingsService(db, secret_box, AiCallService(db, secret_box, chat_client))


def is_transcription_model(name: str) -> bool:
    """
    Tell whether a model only transcribes audio, so a chat connection test cannot check it.

    Args:
        name (str): Model name.

    Returns:
        bool: True for a transcription model.
    """
    return "transcribe" in name or name.startswith("whisper")
