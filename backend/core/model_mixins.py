from datetime import datetime
from enum import StrEnum

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column


MONEY = Numeric(12, 2)

PERCENT = Numeric(5, 2)


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
    Adds the bigint identity primary key every table uses.
    """

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)


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

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))


class ActiveMixin:
    """
    Adds is_active, used instead of deleting reference rows.
    """

    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")

