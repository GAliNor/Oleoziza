from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import DEVICE_LABEL_LENGTH, IdMixin


ACTION_LENGTH = 100

ENTITY_TYPE_LENGTH = 50

SNAPSHOT = JSON().with_variant(JSONB(), "postgresql")


class AuditEvent(IdMixin, Base):
    """
    One entry of the Audit Trail: who did what, when, on which Site; written with the change and never edited.
    """

    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_site_id_occurred_at", "site_id", "occurred_at"),
        Index("ix_audit_events_entity_type_entity_id", "entity_type", "entity_id"),
    )

    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    site_id: Mapped[UUID | None] = mapped_column(ForeignKey("sites.id"))
    action: Mapped[str] = mapped_column(String(ACTION_LENGTH))
    entity_type: Mapped[str | None] = mapped_column(String(ENTITY_TYPE_LENGTH))
    entity_id: Mapped[UUID | None] = mapped_column(Uuid)
    before: Mapped[dict[str, Any] | None] = mapped_column(SNAPSHOT)
    after: Mapped[dict[str, Any] | None] = mapped_column(SNAPSHOT)
    reason: Mapped[str | None] = mapped_column(Text)
    device_label: Mapped[str | None] = mapped_column(String(DEVICE_LABEL_LENGTH))
    was_recorded_offline: Mapped[bool] = mapped_column(default=False, server_default="false")
