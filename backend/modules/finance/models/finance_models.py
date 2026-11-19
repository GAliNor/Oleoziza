from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import LITRES, MONEY, NAME_LENGTH, PERCENT, REFERENCE_LENGTH, AuditMixin, HumanCodeMixin, IdMixin, OfflineEntryMixin, build_enum_type
from modules.configuration.types.configuration_types import PaymentMethod
from modules.finance.types.finance_types import DebtContactKind, DiscountEntry, DiscountState, PaymentStatus, RefundStatus, SettlementOrigin


CHEQUE_NUMBER_LENGTH = 30


class Discount(IdMixin, AuditMixin, Base):
    """
    A reduction of one Lot's Milling Fee given by created_by; a refused one stays as history and a new one can be given.
    """

    __tablename__ = "discounts"
    __table_args__ = (
        Index("uq_discounts_single_in_force_per_lot", "lot_id", unique=True, postgresql_where=text("state <> 'refused'")),
        CheckConstraint("state <> 'refused' OR refusal_reason IS NOT NULL", name="refusal_has_reason"),
        CheckConstraint("amount > 0", name="amount_is_positive"),
    )

    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    entered_as: Mapped[DiscountEntry] = mapped_column(build_enum_type(DiscountEntry, "discount_entered_as"))
    percent: Mapped[Decimal] = mapped_column(PERCENT)
    amount: Mapped[Decimal] = mapped_column(MONEY)
    limit_percent: Mapped[Decimal] = mapped_column(PERCENT)
    state: Mapped[DiscountState] = mapped_column(build_enum_type(DiscountState, "discount_state"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    refusal_reason: Mapped[str | None] = mapped_column(Text)


class Payment(IdMixin, AuditMixin, OfflineEntryMixin, HumanCodeMixin, Base):
    """
    Money or oil a Client settles with the mill, recorded by created_by, then split over the Lots it pays.
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("method <> 'oil' OR (oil_in_litres IS NOT NULL AND oil_price_per_litre IS NOT NULL)", name="oil_payment_has_litres_and_price"),
        CheckConstraint("amount > 0", name="amount_is_positive"),
    )

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"))
    method: Mapped[PaymentMethod] = mapped_column(build_enum_type(PaymentMethod, "payment_method"))
    amount: Mapped[Decimal] = mapped_column(MONEY)
    cheque_number: Mapped[str | None] = mapped_column(String(CHEQUE_NUMBER_LENGTH))
    bank_name: Mapped[str | None] = mapped_column(String(NAME_LENGTH))
    reference: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    oil_in_litres: Mapped[Decimal | None] = mapped_column(LITRES)
    oil_price_per_litre: Mapped[Decimal | None] = mapped_column(MONEY)
    status: Mapped[PaymentStatus] = mapped_column(build_enum_type(PaymentStatus, "payment_status"), default=PaymentStatus.PENDING, server_default=PaymentStatus.PENDING.value)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    decision_note: Mapped[str | None] = mapped_column(Text)


class PaymentAllocation(IdMixin, AuditMixin, Base):
    """
    The part of a Payment that pays one Lot's Milling Fee.
    """

    __tablename__ = "payment_allocations"
    __table_args__ = (
        UniqueConstraint("payment_id", "lot_id"),
        CheckConstraint("amount > 0", name="amount_is_positive"),
    )

    payment_id: Mapped[UUID] = mapped_column(ForeignKey("payments.id"))
    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    amount: Mapped[Decimal] = mapped_column(MONEY)


class PaymentProof(IdMixin, AuditMixin, Base):
    """
    A file attached once as evidence of a Payment or of a Refund.
    """

    __tablename__ = "payment_proofs"
    __table_args__ = (CheckConstraint("(payment_id IS NULL) <> (refund_id IS NULL)", name="proves_one_payment_or_refund"),)

    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id"))
    payment_id: Mapped[UUID | None] = mapped_column(ForeignKey("payments.id"))
    refund_id: Mapped[UUID | None] = mapped_column(ForeignKey("refunds.id"))


class CreditNote(IdMixin, AuditMixin, Base):
    """
    An amount the mill owes a Client on a Site, deducted from the Milling Fees of their next Lots there.
    """

    __tablename__ = "credit_notes"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_is_positive"),)

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"))
    origin: Mapped[SettlementOrigin] = mapped_column(build_enum_type(SettlementOrigin, "credit_note_origin"))
    source_payment_id: Mapped[UUID] = mapped_column(ForeignKey("payments.id"))
    amount: Mapped[Decimal] = mapped_column(MONEY)


class CreditNoteUse(IdMixin, AuditMixin, Base):
    """
    The part of a Credit Note deducted from one Lot's Milling Fee.
    """

    __tablename__ = "credit_note_uses"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_is_positive"),)

    credit_note_id: Mapped[UUID] = mapped_column(ForeignKey("credit_notes.id"))
    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"))
    amount: Mapped[Decimal] = mapped_column(MONEY)


class Refund(IdMixin, AuditMixin, HumanCodeMixin, Base):
    """
    Money the mill gives back to a Client, made by one person and confirmed by another.
    """

    __tablename__ = "refunds"
    __table_args__ = (
        CheckConstraint("method IS NULL OR method <> 'oil'", name="method_is_not_oil"),
        CheckConstraint("confirmed_by_id IS NULL OR confirmed_by_id <> made_by_id", name="confirmed_by_someone_else"),
        CheckConstraint("amount > 0", name="amount_is_positive"),
    )

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"))
    origin: Mapped[SettlementOrigin] = mapped_column(build_enum_type(SettlementOrigin, "refund_origin"))
    source_payment_id: Mapped[UUID] = mapped_column(ForeignKey("payments.id"))
    amount: Mapped[Decimal] = mapped_column(MONEY)
    status: Mapped[RefundStatus] = mapped_column(build_enum_type(RefundStatus, "refund_status"), default=RefundStatus.TO_MAKE, server_default=RefundStatus.TO_MAKE.value)
    method: Mapped[PaymentMethod | None] = mapped_column(build_enum_type(PaymentMethod, "refund_method"))
    reference: Mapped[str | None] = mapped_column(String(REFERENCE_LENGTH))
    made_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    made_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmed_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))


class DebtContact(IdMixin, AuditMixin, OfflineEntryMixin, Base):
    """
    One contact with a Client who owes fees, and the date they promised to pay, if any.
    """

    __tablename__ = "debt_contacts"

    site_id: Mapped[UUID] = mapped_column(ForeignKey("sites.id"))
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"))
    kind: Mapped[DebtContactKind] = mapped_column(build_enum_type(DebtContactKind, "debt_contact_kind"))
    note: Mapped[str] = mapped_column(Text)
    promised_on: Mapped[date | None] = mapped_column(Date)


class RateCorrection(IdMixin, AuditMixin, Base):
    """
    A change of one Lot's Milling Rate after its Reception, with the reason written by created_by.
    """

    __tablename__ = "rate_corrections"
    __table_args__ = (CheckConstraint("new_rate_per_kg >= 0", name="new_rate_is_not_negative"),)

    lot_id: Mapped[UUID] = mapped_column(ForeignKey("lots.id"), index=True)
    previous_rate_per_kg: Mapped[Decimal] = mapped_column(MONEY)
    new_rate_per_kg: Mapped[Decimal] = mapped_column(MONEY)
    reason: Mapped[str] = mapped_column(Text)
