from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import NAME_LENGTH, AuditMixin, IdMixin, TimestampMixin, build_enum_type
from modules.ai.types.ai_types import DEFAULT_MONTHLY_BUDGET_USD, AiApiStyle, AiCallStatus, AiFeature, AiProviderKind


USD = Numeric(14, 6)

PRICE = Numeric(12, 6)

URL_LENGTH = 300

KEY_TAIL_LENGTH = 4

CODE_LENGTH = 64


class AiProvider(IdMixin, AuditMixin, Base):
    """
    One AI provider account the mill holds: where it answers, how it is called, its encrypted key and the AI budget of that key.
    """

    __tablename__ = "ai_providers"

    kind: Mapped[AiProviderKind] = mapped_column(build_enum_type(AiProviderKind, "ai_provider_kind"))
    label: Mapped[str] = mapped_column(String(NAME_LENGTH), unique=True)
    base_url: Mapped[str] = mapped_column(String(URL_LENGTH))
    api_style: Mapped[AiApiStyle] = mapped_column(build_enum_type(AiApiStyle, "ai_api_style"))
    sealed_key: Mapped[str | None] = mapped_column(Text)
    key_last_four: Mapped[str | None] = mapped_column(String(KEY_TAIL_LENGTH))
    monthly_budget_usd: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=DEFAULT_MONTHLY_BUDGET_USD, server_default=str(DEFAULT_MONTHLY_BUDGET_USD))


class AiModel(IdMixin, AuditMixin, Base):
    """
    One model a provider offers, with the prices the usage ledger charges it at.
    """

    __tablename__ = "ai_models"
    __table_args__ = (UniqueConstraint("provider_id", "name"),)

    provider_id: Mapped[UUID] = mapped_column(ForeignKey("ai_providers.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    input_price_per_million: Mapped[Decimal] = mapped_column(PRICE)
    cached_input_price_per_million: Mapped[Decimal | None] = mapped_column(PRICE)
    output_price_per_million: Mapped[Decimal] = mapped_column(PRICE)
    supports_structured_output: Mapped[bool] = mapped_column(default=True, server_default="true")
    is_archived: Mapped[bool] = mapped_column(default=False, server_default="false")


class AiFeatureSetting(AuditMixin, Base):
    """
    Which model an AI feature uses, and how long its requests and responses are kept.
    """

    __tablename__ = "ai_feature_settings"

    feature: Mapped[AiFeature] = mapped_column(build_enum_type(AiFeature, "ai_feature"), primary_key=True)
    model_id: Mapped[UUID | None] = mapped_column(ForeignKey("ai_models.id"))
    payload_retention_days: Mapped[int | None]


class AiCall(IdMixin, TimestampMixin, Base):
    """
    One row of the usage ledger: who asked which AI feature for which record, on which model, what it cost and how it ended.
    """

    __tablename__ = "ai_calls"
    __table_args__ = (Index("ix_ai_calls_provider_created", "provider_id", "created_at"), Index("ix_ai_calls_record", "record_type", "record_id"))

    feature: Mapped[AiFeature] = mapped_column(build_enum_type(AiFeature, "ai_call_feature"))
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    record_type: Mapped[str | None] = mapped_column(String(CODE_LENGTH))
    record_id: Mapped[UUID | None]
    provider_id: Mapped[UUID] = mapped_column(ForeignKey("ai_providers.id"))
    model_id: Mapped[UUID | None] = mapped_column(ForeignKey("ai_models.id", ondelete="SET NULL"))
    model_name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    status: Mapped[AiCallStatus] = mapped_column(build_enum_type(AiCallStatus, "ai_call_status"))
    input_price_per_million: Mapped[Decimal] = mapped_column(PRICE)
    cached_input_price_per_million: Mapped[Decimal | None] = mapped_column(PRICE)
    output_price_per_million: Mapped[Decimal] = mapped_column(PRICE)
    input_tokens: Mapped[int] = mapped_column(default=0, server_default="0")
    cached_input_tokens: Mapped[int] = mapped_column(default=0, server_default="0")
    output_tokens: Mapped[int] = mapped_column(default=0, server_default="0")
    reserved_cost_usd: Mapped[Decimal] = mapped_column(USD)
    cost_usd: Mapped[Decimal] = mapped_column(USD, default=Decimal("0"), server_default="0")
    duration_in_milliseconds: Mapped[int | None]
    error_code: Mapped[str | None] = mapped_column(String(CODE_LENGTH))
    error_detail: Mapped[str | None] = mapped_column(Text)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AiCallPayload(Base):
    """
    The request and response of one AI call, kept only as long as its AI feature says, for debugging from the database only; the app never shows them.
    """

    __tablename__ = "ai_call_payloads"

    call_id: Mapped[UUID] = mapped_column(ForeignKey("ai_calls.id", ondelete="CASCADE"), primary_key=True)
    request: Mapped[dict[str, Any]] = mapped_column(JSONB)
    response: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    purge_after: Mapped[date] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
