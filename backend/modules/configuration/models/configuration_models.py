from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import KILOGRAMS, LITRES, NAME_LENGTH, ActiveMixin, AuditMixin, IdMixin, RetiredMixin, SlugIdMixin, TimestampMixin, build_enum_type
from modules.configuration.types.configuration_types import NotificationChannel, PaymentMethod, SettingKey


SETTING_VALUE = Numeric(12, 2)


class SiteSetting(IdMixin, AuditMixin, Base):
    """
    One version of a Site's price for a Season, suggested to records from effective_from on; set by created_by.
    """

    __tablename__ = "site_settings"
    __table_args__ = (CheckConstraint("season_id IS NOT NULL OR key = 'daily_price_per_kg'", name="season_set_unless_daily_price"),)

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    season_id: Mapped[UUID | None] = mapped_column(ForeignKey("seasons.id"))
    key: Mapped[SettingKey] = mapped_column(build_enum_type(SettingKey, "site_setting_key"))
    value: Mapped[Decimal] = mapped_column(SETTING_VALUE)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PaymentMethodSetting(IdMixin, AuditMixin, Base):
    """
    One version of whether a Site accepts a Payment Method and asks for a proof with it.
    """

    __tablename__ = "payment_method_settings"

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    method: Mapped[PaymentMethod] = mapped_column(build_enum_type(PaymentMethod, "payment_method_setting_method"))
    is_enabled: Mapped[bool]
    is_proof_required: Mapped[bool]
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class NotificationChannelSetting(AuditMixin, Base):
    """
    Whether Management lets the mill message Clients through one Notification Channel, for every Site; no row means off.
    """

    __tablename__ = "notification_channel_settings"

    channel: Mapped[NotificationChannel] = mapped_column(build_enum_type(NotificationChannel, "notification_channel_setting_channel"), primary_key=True)
    is_enabled: Mapped[bool] = mapped_column(default=False, server_default="false")


class Box(IdMixin, AuditMixin, RetiredMixin, Base):
    """
    A numbered container a Client's bags of olives are emptied into, holding one Lot at a time.
    """

    __tablename__ = "boxes"
    __table_args__ = (UniqueConstraint("site_id", "number"),)

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    number: Mapped[int]
    capacity_in_kg: Mapped[Decimal] = mapped_column(KILOGRAMS)


class Tank(IdMixin, AuditMixin, RetiredMixin, Base):
    """
    A numbered container that keeps oil for the longer term; its variety and fill are derived from its Storages.
    """

    __tablename__ = "tanks"
    __table_args__ = (UniqueConstraint("site_id", "number"),)

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    number: Mapped[int]
    capacity_in_litres: Mapped[Decimal] = mapped_column(LITRES)


class PressLine(IdMixin, AuditMixin, RetiredMixin, Base):
    """
    A production line of a Site that presses one Lot at a time.
    """

    __tablename__ = "press_lines"
    __table_args__ = (UniqueConstraint("site_id", "number"),)

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    number: Mapped[int]
    name: Mapped[str | None] = mapped_column(String(NAME_LENGTH))


class OliveVariety(SlugIdMixin, TimestampMixin, ActiveMixin, Base):
    """
    A kind of olive a Lot is made of; a retired variety stays on old Lots.
    """

    __tablename__ = "olive_varieties"

    name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    image_file_id: Mapped[UUID | None] = mapped_column(ForeignKey("files.id"))
