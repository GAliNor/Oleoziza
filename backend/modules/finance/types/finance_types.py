from datetime import date, datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import Field

from core.types import CamelModel


class DiscountEntry(StrEnum):
    """
    How the Accountant typed a Discount.
    """

    PERCENT = "percent"
    AMOUNT = "amount"


class DiscountState(StrEnum):
    """
    Where a Discount stands: within the limit it applies at once, above it waits for a decision.
    """

    APPLIED = "applied"
    PENDING = "pending"
    APPROVED = "approved"
    REFUSED = "refused"


class PaymentStatus(StrEnum):
    """
    Where a Payment stands; a rejected or cancelled one no longer counts.
    """

    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class SettlementOrigin(StrEnum):
    """
    Why the mill owes a Client money: a cancelled Payment or one that paid too much.
    """

    PAYMENT_CANCELLED = "payment_cancelled"
    OVERPAYMENT = "overpayment"


class RefundStatus(StrEnum):
    """
    Where a Refund stands: to make, made, then confirmed by someone else.
    """

    TO_MAKE = "to_make"
    MADE = "made"
    CONFIRMED = "confirmed"


class DebtContactKind(StrEnum):
    """
    How the Accountant reached a Client who owes fees.
    """

    CALL = "call"
    SMS = "sms"
    VISIT = "visit"
    NOTE = "note"


class Settlement(StrEnum):
    """
    What becomes of money the mill holds for a Client: a Credit Note on their next Lots, or a Refund to make.
    """

    CREDIT_NOTE = "credit_note"
    REFUND = "refund"


class PaymentDocumentOut(CamelModel):
    """
    A Payment Proof as the screens show it, read through a signed URL.
    """

    id: UUID
    name: str
    url: str
    is_pdf: bool
    added_by: str
    added_at: datetime


class PaymentDocumentIn(CamelModel):
    """
    A proof picked on the phone, sent as a data URL; the backend stores it in the private bucket.
    """

    name: str = Field(max_length=255)
    url: str
    is_pdf: bool = False


class LotPaymentLinkIn(CamelModel):
    """
    The part of a Payment that pays one Lot.
    """

    lot_id: UUID
    amount: float = Field(gt=0)


class LotPaymentLinkOut(LotPaymentLinkIn):
    """
    A Payment Allocation with its Lot's code.
    """

    lot_code: str


class MovementOut(CamelModel):
    """
    A Payment as the cash desk, the register and the Lot read it, with its Allocations, Proofs and decision.
    """

    id: UUID
    code: str
    kind: Literal["payment"] = "payment"
    purpose: Literal["fee"] = "fee"
    site_id: UUID
    client_id: UUID
    client: str
    lot_links: list[LotPaymentLinkOut]
    amount: float
    method: str
    reference: str | None = None
    oil_litres: float | None = None
    documents: list[PaymentDocumentOut]
    status: PaymentStatus
    recorded_by: str
    recorded_at: datetime
    was_offline: bool = False
    decided_by: str | None = None
    decided_at: datetime | None = None
    note: str | None = None
    settlement: Settlement | None = None


class PaymentRecordIn(CamelModel):
    """
    A Payment typed at the cash desk; the id is minted when the form opens, so a replay records it once.
    """

    id: UUID
    site_id: UUID
    client_id: UUID
    lot_links: list[LotPaymentLinkIn] = []
    amount: float = Field(gt=0)
    method: str
    reference: str | None = Field(default=None, max_length=100)
    oil_litres: float | None = Field(default=None, gt=0)
    documents: list[PaymentDocumentIn] = []
    is_final: bool = False
    entered_at: datetime | None = None
    recorded_offline: bool = False
    device_label: str | None = Field(default=None, max_length=120)


class MovementDecisionIn(CamelModel):
    """
    Confirming, rejecting or cancelling a Payment, with what becomes of a surplus or of a cancelled confirmed Payment.
    """

    status: Literal["confirmed", "rejected", "cancelled"]
    note: str | None = Field(default=None, max_length=500)
    settlement: Settlement | None = None


class RefundOut(CamelModel):
    """
    Money to give back to a Client, as the Refunds list shows it.
    """

    id: UUID
    site_id: UUID
    client_id: UUID
    client: str
    source_code: str
    amount: float
    status: RefundStatus
    created_at: datetime
    method: str | None = None
    reference: str | None = None
    documents: list[PaymentDocumentOut]
    made_by: str | None = None
    made_at: datetime | None = None
    confirmed_by: str | None = None
    confirmed_at: datetime | None = None


class RefundMadeIn(CamelModel):
    """
    How a Refund was paid back.
    """

    method: str
    reference: str | None = Field(default=None, max_length=100)
    documents: list[PaymentDocumentIn] = []


class DebtContactOut(CamelModel):
    """
    One step of the Debt Follow-up.
    """

    id: UUID
    site_id: UUID
    client_id: UUID
    kind: DebtContactKind
    note: str
    promised_on: date | None
    by: str
    at: datetime


class DebtContactIn(CamelModel):
    """
    A contact with a Client who owes; the id is minted when the form opens.
    """

    id: UUID
    site_id: UUID
    client_id: UUID
    kind: DebtContactKind
    note: str = Field(min_length=1)
    promised_on: date | None = None


class SalesFiguresOut(CamelModel):
    """
    The four figures over the Lots received in the period: revenue = collected + pending + outstanding.
    """

    revenue: float
    collected: float
    pending: float
    outstanding: float
    pending_count: int


class SalesBucketOut(CamelModel):
    """
    One bar of the sales chart: a day or a week, labelled by the front.
    """

    starts_on: date
    ends_on: date
    revenue: float
    collected: float
    is_current: bool


class PaymentMethodShareOut(CamelModel):
    """
    How much of the period's confirmed money came by one method.
    """

    key: str
    amount: float


class SalesOut(CamelModel):
    """
    The Finances tab: figures, chart buckets and methods for one period.
    """

    figures: SalesFiguresOut
    chart_title_key: str
    buckets: list[SalesBucketOut]
    methods: list[PaymentMethodShareOut]


class MovementPageOut(CamelModel):
    """
    One page of the register, with the list's size.
    """

    items: list[MovementOut]
    total: int


class RefundPageOut(CamelModel):
    """
    One page of the Refunds, with the list's size.
    """

    items: list[RefundOut]
    total: int
