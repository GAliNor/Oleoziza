from decimal import Decimal
from typing import Any

from modules.ai.business.ai_pricing import ModelPrices
from modules.ai.models.ai_models import AiCall, AiFeatureSetting, AiModel, AiProvider
from modules.ai.types.ai_types import (
    FEATURE_API_STYLES,
    FEATURE_NEEDS_STRUCTURED_OUTPUT,
    AiCallOut,
    AiFeature,
    AiFeatureSettingOut,
    AiModelOut,
    AiProviderKind,
    AiProviderOut,
)


def build_model_prices(model: AiModel) -> ModelPrices:
    """
    Read a model's prices for pricing a call.

    Args:
        model (AiModel): Model.

    Returns:
        ModelPrices: Its prices per million tokens.
    """
    return ModelPrices(model.input_price_per_million, model.cached_input_price_per_million, model.output_price_per_million)


def build_call_prices(call: AiCall) -> ModelPrices:
    """
    Read the prices frozen on a ledger row.

    Args:
        call (AiCall): Ledger row.

    Returns:
        ModelPrices: The prices it is charged at.
    """
    return ModelPrices(call.input_price_per_million, call.cached_input_price_per_million, call.output_price_per_million)


def build_provider_extra_body(kind: AiProviderKind) -> dict[str, Any]:
    """
    Add the request options only OpenAI itself accepts: low reasoning effort, and no storing of the exchange on its side.

    Args:
        kind (AiProviderKind): Provider kind.

    Returns:
        dict[str, Any]: Extra Chat Completions fields.
    """
    return {"reasoning_effort": "low", "store": False} if kind == AiProviderKind.OPENAI else {}


def map_provider(provider: AiProvider, spent_usd: Decimal) -> AiProviderOut:
    """
    Show a provider without its key, only whether one is set and its last four characters.

    Args:
        provider (AiProvider): Provider.
        spent_usd (Decimal): Spent and reserved this month on its key.

    Returns:
        AiProviderOut: The provider as the settings page shows it.
    """
    return AiProviderOut(
        id=provider.id,
        kind=provider.kind,
        label=provider.label,
        base_url=provider.base_url,
        api_style=provider.api_style,
        has_key=provider.sealed_key is not None,
        key_last_four=provider.key_last_four,
        monthly_budget_usd=provider.monthly_budget_usd,
        spent_this_month_usd=spent_usd,
        updated_at=provider.updated_at,
    )


def map_model(model: AiModel) -> AiModelOut:
    """
    Show a model and its prices.

    Args:
        model (AiModel): Model.

    Returns:
        AiModelOut: The model.
    """
    return AiModelOut(
        id=model.id,
        provider_id=model.provider_id,
        name=model.name,
        input_price_per_million=model.input_price_per_million,
        cached_input_price_per_million=model.cached_input_price_per_million,
        output_price_per_million=model.output_price_per_million,
        supports_structured_output=model.supports_structured_output,
        is_archived=model.is_archived,
    )


def map_feature_setting(feature: AiFeature, setting: AiFeatureSetting | None) -> AiFeatureSettingOut:
    """
    Show an AI feature's model and retention, with what kind of model it can use.

    Args:
        feature (AiFeature): AI feature.
        setting (AiFeatureSetting | None): Its setting, None when never configured.

    Returns:
        AiFeatureSettingOut: The feature setting.
    """
    return AiFeatureSettingOut(
        feature=feature,
        model_id=setting.model_id if setting else None,
        payload_retention_days=setting.payload_retention_days if setting else None,
        api_styles=list(FEATURE_API_STYLES.get(feature, ())),
        needs_structured_output=FEATURE_NEEDS_STRUCTURED_OUTPUT.get(feature, False),
    )


def map_call(call: AiCall, user_name: str | None, provider_label: str) -> AiCallOut:
    """
    Show one ledger row.

    Args:
        call (AiCall): Ledger row.
        user_name (str | None): Who made it.
        provider_label (str): Its provider's label.

    Returns:
        AiCallOut: The row as the usage page lists it.
    """
    return AiCallOut(
        id=call.id,
        created_at=call.created_at,
        feature=call.feature,
        status=call.status,
        user_name=user_name,
        provider_label=provider_label,
        model_name=call.model_name,
        record_type=call.record_type,
        record_id=call.record_id,
        input_tokens=call.input_tokens,
        output_tokens=call.output_tokens,
        cost_usd=call.cost_usd,
        duration_in_milliseconds=call.duration_in_milliseconds,
        error_code=call.error_code,
    )
