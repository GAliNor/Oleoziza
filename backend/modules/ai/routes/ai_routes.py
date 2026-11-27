from uuid import UUID
from fastapi import APIRouter, Depends, Query

from core.security import get_current_owner
from core.types import CurrentUser
from modules.ai.services.ai_settings_services import AiSettingsService, get_ai_settings_service
from modules.ai.services.ai_usage_services import AiUsageService, get_ai_usage_service
from modules.ai.types.ai_types import (
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
    AiUsageOut,
)


router = APIRouter(tags=["ai"])


@router.get("/settings", response_model=AiSettingsOut, dependencies=[Depends(get_current_owner)])
def get_ai_settings(ai_settings_service: AiSettingsService = Depends(get_ai_settings_service)) -> AiSettingsOut:
    """
    Load the AI settings page: providers (keys masked), models, AI feature settings (Owner).

    Args:
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiSettingsOut: The settings.
    """
    return ai_settings_service.get_settings()


@router.post("/providers", response_model=AiProviderOut, status_code=201)
def create_ai_provider(
    payload: AiProviderIn,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiProviderOut:
    """
    Add a provider account (Owner).

    Args:
        payload (AiProviderIn): Kind, label, base URL, calling style.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiProviderOut: The provider.
    """
    return ai_settings_service.create_provider(payload, current_user)


@router.put("/providers/{provider_id}", response_model=AiProviderOut)
def update_ai_provider(
    provider_id: UUID,
    payload: AiProviderIn,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiProviderOut:
    """
    Change a provider's label, base URL or calling style (Owner).

    Args:
        provider_id (UUID): Provider id.
        payload (AiProviderIn): New values.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiProviderOut: The provider.
    """
    return ai_settings_service.update_provider(provider_id, payload, current_user)


@router.put("/providers/{provider_id}/key", response_model=AiProviderOut)
def set_ai_provider_key(
    provider_id: UUID,
    payload: AiProviderKeyIn,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiProviderOut:
    """
    Test then store a provider key, encrypted (Owner).

    Args:
        provider_id (UUID): Provider id.
        payload (AiProviderKeyIn): Key and the model to test it with.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiProviderOut: The provider, key masked.
    """
    return ai_settings_service.set_provider_key(provider_id, payload, current_user)


@router.delete("/providers/{provider_id}/key", response_model=AiProviderOut)
def remove_ai_provider_key(
    provider_id: UUID,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiProviderOut:
    """
    Forget a provider key (Owner).

    Args:
        provider_id (UUID): Provider id.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiProviderOut: The provider.
    """
    return ai_settings_service.remove_provider_key(provider_id, current_user)


@router.put("/providers/{provider_id}/budget", response_model=AiProviderOut)
def set_ai_provider_budget(
    provider_id: UUID,
    payload: AiProviderBudgetIn,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiProviderOut:
    """
    Set the monthly AI budget of a provider key (Owner).

    Args:
        provider_id (UUID): Provider id.
        payload (AiProviderBudgetIn): Budget in USD.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiProviderOut: The provider.
    """
    return ai_settings_service.set_provider_budget(provider_id, payload, current_user)


@router.post("/models", response_model=AiModelOut, status_code=201)
def create_ai_model(
    payload: AiModelIn,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiModelOut:
    """
    Add a model with its prices (Owner).

    Args:
        payload (AiModelIn): Provider, model id and prices.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiModelOut: The model.
    """
    return ai_settings_service.create_model(payload, current_user)


@router.put("/models/{model_id}", response_model=AiModelOut)
def update_ai_model(
    model_id: UUID,
    payload: AiModelUpdateIn,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiModelOut:
    """
    Change a model's prices or archive it (Owner).

    Args:
        model_id (UUID): Model id.
        payload (AiModelUpdateIn): New values.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiModelOut: The model.
    """
    return ai_settings_service.update_model(model_id, payload, current_user)


@router.post("/models/{model_id}/test", response_model=AiConnectionTestOut)
def test_ai_model(
    model_id: UUID,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiConnectionTestOut:
    """
    Run a tiny test call on a model with its provider's key (Owner).

    Args:
        model_id (UUID): Model id.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiConnectionTestOut: The test result.
    """
    return ai_settings_service.test_model(model_id, current_user)


@router.put("/features/{feature}", response_model=AiFeatureSettingOut)
def set_ai_feature(
    feature: AiFeature,
    payload: AiFeatureSettingIn,
    current_user: CurrentUser = Depends(get_current_owner),
    ai_settings_service: AiSettingsService = Depends(get_ai_settings_service),
) -> AiFeatureSettingOut:
    """
    Point an AI feature at a model after a test call, and set its payload retention (Owner).

    Args:
        feature (AiFeature): AI feature.
        payload (AiFeatureSettingIn): Model and retention.
        current_user (CurrentUser): The Owner.
        ai_settings_service (AiSettingsService): Injected service.

    Returns:
        AiFeatureSettingOut: The setting.
    """
    return ai_settings_service.set_feature(feature, payload, current_user)


@router.get("/usage", response_model=AiUsageOut, dependencies=[Depends(get_current_owner)])
def get_ai_usage(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    feature: AiFeature | None = None,
    user_id: UUID | None = Query(default=None, alias="userId"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    ai_usage_service: AiUsageService = Depends(get_ai_usage_service),
) -> AiUsageOut:
    """
    Load a month of AI usage (Owner).

    Args:
        month (str | None): "YYYY-MM", the current month by default.
        feature (AiFeature | None): Filter the call list by AI feature.
        user_id (UUID | None): Filter the call list by User.
        offset (int): Calls skipped.
        limit (int): Page size.
        ai_usage_service (AiUsageService): Injected service.

    Returns:
        AiUsageOut: Budgets, totals and calls.
    """
    return ai_usage_service.get_usage(month, feature, user_id, offset, limit)

