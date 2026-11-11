from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from uuid_utils.compat import uuid7


MONEY = Numeric(12, 2)

PERCENT = Numeric(5, 2)

KILOGRAMS = Numeric(10, 1)

LITRES = Numeric(10, 1)

SLUG_LENGTH = 64

HUMAN_CODE_LENGTH = 20

DEVICE_LABEL_LENGTH = 120


def build_enum_type(enum_class: type[StrEnum], name: str) -> Enum:
    """
    Build a native Postgres enum type storing the enum values rather than the member names.

    Args:
        enum_class (type[StrEnum]): Python enum backing the column.
        name (str): Name of the Postgres enum type.

    Returns:
        Enum: SQLAlchemy enum type ready to use in mapped_column.
    """
    return Enum(enum_class, name=name, values_callable=lambda members: [member.value for member in members])


class IdMixin:
    """
    Adds the UUID primary key every table uses: minted by the device for offline entries, otherwise a server UUID v7.
    """

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)


class SlugIdMixin:
    """
    Adds a readable slug primary key, used by reference data with a fixed meaning (Province, Olive Variety).
    """

    id: Mapped[str] = mapped_column(String(SLUG_LENGTH), primary_key=True)


class TimestampMixin:
    """
    Adds created_at and updated_at, kept by the database.
    """

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AuditMixin(TimestampMixin):
    """
    Adds the timestamps plus the users who created and last updated a business row.
    """

    created_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    updated_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))


class OfflineEntryMixin:
    """
    Adds what a row typed on a phone keeps about its entry: the business time it was typed, whether it waited offline, and the device.
    """

    entered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    was_recorded_offline: Mapped[bool] = mapped_column(default=False, server_default="false")
    device_label: Mapped[str | None] = mapped_column(String(DEVICE_LABEL_LENGTH))


class HumanCodeMixin:
    """
    Adds the readable code people print and search (OJ-2627-0158), empty until the server gives it at sync.
    """

    code: Mapped[str | None] = mapped_column(String(HUMAN_CODE_LENGTH), unique=True)


class ActiveMixin:
    """
    Adds is_active, used instead of deleting reference rows.
    """

    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
