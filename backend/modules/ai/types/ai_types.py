from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Any
from uuid import UUID

from pydantic import Field, PlainSerializer

from core.types import CamelModel


MoneyAmount = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]


class AiProviderKind(StrEnum):
    OPENAI = "openai"
    OTHER = "other"


class AiApiStyle(StrEnum):
    OPENAI_CHAT = "openai_chat"


class AiFeature(StrEnum):
    ASSISTANT = "assistant"
    ASSISTANT_TRANSCRIPTION = "assistant_transcription"
    CONNECTION_TEST = "connection_test"


class AiCallStatus(StrEnum):
    RESERVED = "reserved"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUSED = "refused"


CONFIGURABLE_FEATURES = (AiFeature.ASSISTANT, AiFeature.ASSISTANT_TRANSCRIPTION)

FEATURE_API_STYLES: dict[AiFeature, tuple[AiApiStyle, ...]] = {
    AiFeature.ASSISTANT: (AiApiStyle.OPENAI_CHAT,),
    AiFeature.ASSISTANT_TRANSCRIPTION: (AiApiStyle.OPENAI_CHAT,),
}

FEATURE_NEEDS_STRUCTURED_OUTPUT: dict[AiFeature, bool] = {
    AiFeature.ASSISTANT: True,
    AiFeature.ASSISTANT_TRANSCRIPTION: False,
}

DEFAULT_MONTHLY_BUDGET_USD = Decimal("20")

TRANSCRIPTION_PRICE_PER_MINUTE_USD = Decimal("0.0045")

MAXIMUM_TRANSCRIPTION_SECONDS = 60

DEFAULT_PAYLOAD_RETENTION_DAYS = 30

MAXIMUM_PAYLOAD_RETENTION_DAYS = 365

CHARACTERS_PER_TOKEN_ESTIMATE = 4

BUDGET_TIME_ZONE = "Africa/Casablanca"

CONNECTION_TEST_MAX_OUTPUT_TOKENS = 64

AI_PROVIDER_ENTITY_TYPE = "ai_provider"

AI_MODEL_ENTITY_TYPE = "ai_model"

AI_FEATURE_ENTITY_TYPE = "ai_feature"

TOKENS_PER_PRICE_UNIT = 1_000_000

UsdPrice = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=6)]


class StructuredCallResult(CamelModel):
    """
    What a successful AI call hands back to the AI feature that asked: the JSON answer and the ledger row it was recorded on.
    """

    call_id: UUID
    content: dict[str, Any]
    cost_usd: Decimal
    model_name: str


class AiProviderOut(CamelModel):
    id: UUID
    kind: AiProviderKind
    label: str
    base_url: str
    api_style: AiApiStyle
    has_key: bool
    key_last_four: str | None
    monthly_budget_usd: MoneyAmount
    spent_this_month_usd: MoneyAmount
    updated_at: datetime


class AiProviderIn(CamelModel):
    kind: AiProviderKind
    label: str = Field(min_length=1, max_length=60)
    base_url: str = Field(min_length=8, max_length=300, pattern=r"^https://")
    api_style: AiApiStyle = AiApiStyle.OPENAI_CHAT


class AiProviderKeyIn(CamelModel):
    api_key: str = Field(min_length=8, max_length=500)
    test_model_id: UUID


class AiProviderBudgetIn(CamelModel):
    monthly_budget_usd: Decimal = Field(ge=0, le=100_000, max_digits=12, decimal_places=2)


class AiModelOut(CamelModel):
    id: UUID
    provider_id: UUID
    name: str
    input_price_per_million: MoneyAmount
    cached_input_price_per_million: MoneyAmount | None
    output_price_per_million: MoneyAmount
    supports_structured_output: bool
    is_archived: bool


class AiModelIn(CamelModel):
    provider_id: UUID
    name: str = Field(min_length=1, max_length=120)
    input_price_per_million: UsdPrice
    cached_input_price_per_million: UsdPrice | None = None
    output_price_per_million: UsdPrice
    supports_structured_output: bool = True


class AiModelUpdateIn(CamelModel):
    input_price_per_million: UsdPrice
    cached_input_price_per_million: UsdPrice | None = None
    output_price_per_million: UsdPrice
    supports_structured_output: bool = True
    is_archived: bool = False


class AiFeatureSettingOut(CamelModel):
    feature: AiFeature
    model_id: UUID | None
    payload_retention_days: int | None
    api_styles: list[AiApiStyle]
    needs_structured_output: bool


class AiFeatureSettingIn(CamelModel):
    model_id: UUID
    payload_retention_days: int | None = Field(default=None, ge=1, le=MAXIMUM_PAYLOAD_RETENTION_DAYS)


class AiSettingsOut(CamelModel):
    providers: list[AiProviderOut]
    models: list[AiModelOut]
    features: list[AiFeatureSettingOut]
    has_secrets_key: bool


class AiConnectionTestOut(CamelModel):
    is_ok: bool
    code: str | None
    duration_in_milliseconds: int | None


class AiUsageTotalOut(CamelModel):
    key: str
    label: str
    call_count: int
    cost_usd: MoneyAmount


class AiProviderBudgetOut(CamelModel):
    provider_id: UUID
    label: str
    monthly_budget_usd: MoneyAmount
    spent_usd: MoneyAmount
    reserved_usd: MoneyAmount


class AiCallOut(CamelModel):
    id: UUID
    created_at: datetime
    feature: AiFeature
    status: AiCallStatus
    user_name: str | None
    provider_label: str
    model_name: str
    record_type: str | None
    record_id: UUID | None
    input_tokens: int
    output_tokens: int
    cost_usd: MoneyAmount
    duration_in_milliseconds: int | None
    error_code: str | None


class AiUsageOut(CamelModel):
    month: str
    budgets: list[AiProviderBudgetOut]
    by_feature: list[AiUsageTotalOut]
    by_member: list[AiUsageTotalOut]
    calls: list[AiCallOut]
    total: int

