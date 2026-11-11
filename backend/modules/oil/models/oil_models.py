from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import LITRES, NAME_LENGTH, PHONE_LENGTH, AuditMixin, HumanCodeMixin, IdMixin, OfflineEntryMixin, build_enum_type
from modules.oil.types.oil_types import StorageDrawReason, StorageOwner, WithdrawalKind


class Storage(IdMixin, AuditMixin, OfflineEntryMixin, Base):
    """
    Some of one Lot's oil poured into one Tank for its owner; what remains is derived from its draws.
    """

    __tablename__ = "storages"
    __table_args__ = (
        CheckConstraint("owner <> 'client' OR client_id IS NOT NULL", name="client_storage_names_client"),
        CheckConstraint("oil_in_litres > 0", name="oil_is_positive"),
    )

    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    tank_id: Mapped[UUID] = mapped_column(ForeignKey("tanks.id"))
    owner: Mapped[StorageOwner] = mapped_column(build_enum_type(StorageOwner, "storage_owner"))
    client_id: Mapped[UUID | None] = mapped_column(ForeignKey("clients.id"))
    oil_in_litres: Mapped[Decimal] = mapped_column(LITRES)
    stored_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    planned_until: Mapped[date | None] = mapped_column(Date)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_payment_id: Mapped[UUID | None] = mapped_column(ForeignKey("payments.id"))


class StorageDraw(IdMixin, AuditMixin, Base):
    """
    Oil leaving one Storage, for a Withdrawal, an oil Payment, or later a sale.
    """

    __tablename__ = "storage_draws"
    __table_args__ = (
        CheckConstraint("reason <> 'withdrawal' OR withdrawal_id IS NOT NULL", name="withdrawal_draw_names_withdrawal"),
        CheckConstraint("reason <> 'oil_payment' OR payment_id IS NOT NULL", name="oil_payment_draw_names_payment"),
        CheckConstraint("oil_in_litres > 0", name="oil_is_positive"),
    )

    storage_id: Mapped[UUID] = mapped_column(ForeignKey("storages.id"))
    oil_in_litres: Mapped[Decimal] = mapped_column(LITRES)
    reason: Mapped[StorageDrawReason] = mapped_column(build_enum_type(StorageDrawReason, "storage_draw_reason"))
    withdrawal_id: Mapped[UUID | None] = mapped_column(ForeignKey("withdrawals.id"))
    payment_id: Mapped[UUID | None] = mapped_column(ForeignKey("payments.id"))
    is_reversed: Mapped[bool] = mapped_column(default=False, server_default="false")


class Withdrawal(IdMixin, AuditMixin, OfflineEntryMixin, HumanCodeMixin, Base):
    """
    Some of one Lot's oil leaving the mill with the Client or someone they send.
    """

    __tablename__ = "withdrawals"

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    kind: Mapped[WithdrawalKind] = mapped_column(build_enum_type(WithdrawalKind, "withdrawal_kind"))
    taken_by_name: Mapped[str] = mapped_column(String(NAME_LENGTH))
    taken_by_phone: Mapped[str | None] = mapped_column(String(PHONE_LENGTH))
    is_taken_by_client: Mapped[bool]
    was_unpaid: Mapped[bool] = mapped_column(default=False, server_default="false")


class WithdrawalLine(IdMixin, AuditMixin, Base):
    """
    A count of same-size containers the Client filled, such as 8 cans of 20 L.
    """

    __tablename__ = "withdrawal_lines"
    __table_args__ = (
        CheckConstraint("container_count > 0", name="container_count_is_positive"),
        CheckConstraint("container_in_litres > 0", name="container_is_positive"),
    )

    withdrawal_id: Mapped[UUID] = mapped_column(ForeignKey("withdrawals.id"))
    container_in_litres: Mapped[Decimal] = mapped_column(LITRES)
    container_count: Mapped[int]
