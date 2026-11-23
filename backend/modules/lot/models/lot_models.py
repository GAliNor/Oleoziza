from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import EMAIL_LENGTH, KILOGRAMS, LITRES, MONEY, AuditMixin, HumanCodeMixin, IdMixin, OfflineEntryMixin, TimestampMixin, build_enum_type
from modules.configuration.types.configuration_types import NotificationChannel
from modules.lot.types.lot_types import LotMode, LotPhotoStep, LotStatus, NotificationChoice, NotificationEvent, NotificationStatus, PauseReason


class Lot(IdMixin, AuditMixin, OfflineEntryMixin, HumanCodeMixin, Base):
    """
    The olives of one Reception, pressed on their own; receiving them creates the Lot (received by created_by), and its Pressing lives on it.
    """

    __tablename__ = "lots"
    __table_args__ = (
        CheckConstraint("mode <> 'service_milling' OR (suggested_milling_rate_per_kg IS NOT NULL AND milling_rate_per_kg IS NOT NULL)", name="service_milling_has_rates"),
        CheckConstraint("net_weight_in_kg > 0", name="net_weight_is_positive"),
        CheckConstraint("(press_line_id IS NULL) = (planned_start_at IS NULL)", name="line_and_start_come_together"),
        CheckConstraint("status = 'waiting' OR press_line_id IS NOT NULL", name="only_a_waiting_lot_has_no_line"),
        Index("ix_lots_without_line", "site_id", "entered_at", postgresql_where=text("press_line_id IS NULL")),
    )

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    season_id: Mapped[UUID] = mapped_column(ForeignKey("seasons.id"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"))
    mode: Mapped[LotMode] = mapped_column(build_enum_type(LotMode, "lot_mode"))
    olive_variety_id: Mapped[str] = mapped_column(ForeignKey("olive_varieties.id"))
    net_weight_in_kg: Mapped[Decimal] = mapped_column(KILOGRAMS)
    suggested_milling_rate_per_kg: Mapped[Decimal | None] = mapped_column(MONEY)
    milling_rate_per_kg: Mapped[Decimal | None] = mapped_column(MONEY)
    suggested_daily_price_per_kg: Mapped[Decimal | None] = mapped_column(MONEY)
    daily_price_per_kg: Mapped[Decimal | None] = mapped_column(MONEY)
    notification_choice: Mapped[NotificationChoice] = mapped_column(build_enum_type(NotificationChoice, "lot_notification_choice"))
    status: Mapped[LotStatus] = mapped_column(build_enum_type(LotStatus, "lot_status"), default=LotStatus.WAITING, server_default=LotStatus.WAITING.value)
    press_line_id: Mapped[UUID | None] = mapped_column(ForeignKey("press_lines.id"))
    planned_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pressing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pressing_started_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    pressing_ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pressing_ended_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    oil_in_litres: Mapped[Decimal | None] = mapped_column(LITRES)


class BoxOccupancy(IdMixin, AuditMixin, Base):
    """
    A Box holding a Lot's olives, from the Reception until its Pressing starts.
    """

    __tablename__ = "box_occupancies"
    __table_args__ = (Index("uq_box_occupancies_single_open_per_box", "box_id", unique=True, postgresql_where=text("occupied_until IS NULL")),)

    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    box_id: Mapped[UUID] = mapped_column(ForeignKey("boxes.id"))
    occupied_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    occupied_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PressingPause(IdMixin, AuditMixin, OfflineEntryMixin, Base):
    """
    A stop during a Lot's Pressing, paused by created_by and resumed later.
    """

    __tablename__ = "pressing_pauses"

    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    reason: Mapped[PauseReason] = mapped_column(build_enum_type(PauseReason, "pressing_pause_reason"))
    note: Mapped[str | None] = mapped_column(Text)
    paused_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resumed_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))


class LotPhoto(IdMixin, AuditMixin, OfflineEntryMixin, Base):
    """
    An optional photo of a Lot's step, taken by created_by, shown in the Lot Timeline.
    """

    __tablename__ = "lot_photos"

    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    step: Mapped[LotPhotoStep] = mapped_column(build_enum_type(LotPhotoStep, "lot_photo_step"))
    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id"))


class Notification(IdMixin, TimestampMixin, Base):
    """
    A message sent to a Client about their Lot, through the channel of its Notification Choice.
    """

    __tablename__ = "notifications"

    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    event: Mapped[NotificationEvent] = mapped_column(build_enum_type(NotificationEvent, "notification_event"))
    channel: Mapped[NotificationChannel] = mapped_column(build_enum_type(NotificationChannel, "notification_channel"))
    sent_to: Mapped[str] = mapped_column(String(EMAIL_LENGTH))
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[NotificationStatus] = mapped_column(build_enum_type(NotificationStatus, "notification_status"))
    failure_reason: Mapped[str | None] = mapped_column(Text)
