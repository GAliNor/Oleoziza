from datetime import datetime
from enum import StrEnum
from uuid import UUID

from core.types import CamelModel


class ActivityGroup(StrEnum):
    """
    The Journal's filters: production, storage, Discounts, Payments, Expenses, debt follow-up, Configuration.
    """

    PRODUCTION = "production"
    STORAGE = "storage"
    DISCOUNT = "discount"
    PAYMENT = "payment"
    EXPENSE = "expense"
    FOLLOW = "follow"
    CONFIGURATION = "configuration"


class ActivityKind(StrEnum):
    """
    The business events the Journal tells, each read from an Audit Event or a Storage.
    """

    RECEPTION = "reception"
    SCHEDULED = "scheduled"
    PRESSING = "pressing"
    PRESSED = "pressed"
    WITHDRAWAL = "withdrawal"
    STORED = "stored"
    RATE_CORRECTED = "rate_corrected"
    DISCOUNT_GIVEN = "discount_given"
    DISCOUNT_PENDING = "discount_pending"
    DISCOUNT_APPROVED = "discount_approved"
    DISCOUNT_REFUSED = "discount_refused"
    PAYMENT_RECORDED = "payment_recorded"
    PAYMENT_CONFIRMED = "payment_confirmed"
    PAYMENT_REJECTED = "payment_rejected"
    PAYMENT_CANCELLED = "payment_cancelled"
    REFUND_MADE = "refund_made"
    REFUND_CONFIRMED = "refund_confirmed"
    EXPENSE_RECORDED = "expense_recorded"
    EXPENSE_PLANNED = "expense_planned"
    EXPENSE_PAID = "expense_paid"
    EXPENSE_UNPAID = "expense_unpaid"
    EXPENSE_UPDATED = "expense_updated"
    EXPENSE_CANCELLED = "expense_cancelled"
    EXPENSE_DELETED = "expense_deleted"
    EXPENSE_RECURRENCE_STOPPED = "expense_recurrence_stopped"
    DEBT_CONTACT = "debt_contact"
    CONFIGURATION = "configuration"


GROUP_BY_KIND: dict[ActivityKind, ActivityGroup] = {
    ActivityKind.RECEPTION: ActivityGroup.PRODUCTION,
    ActivityKind.SCHEDULED: ActivityGroup.PRODUCTION,
    ActivityKind.PRESSING: ActivityGroup.PRODUCTION,
    ActivityKind.PRESSED: ActivityGroup.PRODUCTION,
    ActivityKind.WITHDRAWAL: ActivityGroup.PRODUCTION,
    ActivityKind.STORED: ActivityGroup.STORAGE,
    ActivityKind.RATE_CORRECTED: ActivityGroup.DISCOUNT,
    ActivityKind.DISCOUNT_GIVEN: ActivityGroup.DISCOUNT,
    ActivityKind.DISCOUNT_PENDING: ActivityGroup.DISCOUNT,
    ActivityKind.DISCOUNT_APPROVED: ActivityGroup.DISCOUNT,
    ActivityKind.DISCOUNT_REFUSED: ActivityGroup.DISCOUNT,
    ActivityKind.PAYMENT_RECORDED: ActivityGroup.PAYMENT,
    ActivityKind.PAYMENT_CONFIRMED: ActivityGroup.PAYMENT,
    ActivityKind.PAYMENT_REJECTED: ActivityGroup.PAYMENT,
    ActivityKind.PAYMENT_CANCELLED: ActivityGroup.PAYMENT,
    ActivityKind.REFUND_MADE: ActivityGroup.PAYMENT,
    ActivityKind.REFUND_CONFIRMED: ActivityGroup.PAYMENT,
    ActivityKind.EXPENSE_RECORDED: ActivityGroup.EXPENSE,
    ActivityKind.EXPENSE_PLANNED: ActivityGroup.EXPENSE,
    ActivityKind.EXPENSE_PAID: ActivityGroup.EXPENSE,
    ActivityKind.EXPENSE_UNPAID: ActivityGroup.EXPENSE,
    ActivityKind.EXPENSE_UPDATED: ActivityGroup.EXPENSE,
    ActivityKind.EXPENSE_CANCELLED: ActivityGroup.EXPENSE,
    ActivityKind.EXPENSE_DELETED: ActivityGroup.EXPENSE,
    ActivityKind.EXPENSE_RECURRENCE_STOPPED: ActivityGroup.EXPENSE,
    ActivityKind.DEBT_CONTACT: ActivityGroup.FOLLOW,
    ActivityKind.CONFIGURATION: ActivityGroup.CONFIGURATION,
}

MONEY_GROUPS = (ActivityGroup.DISCOUNT, ActivityGroup.PAYMENT, ActivityGroup.EXPENSE, ActivityGroup.FOLLOW)


class JournalEventOut(CamelModel):
    """
    One thing someone did on a Site, told as a business event; the front turns the entity into a link.
    """

    id: str
    kind: ActivityKind
    group: ActivityGroup
    at: datetime
    by: str
    subject: str
    params: dict[str, str | int | float]
    amount: float | None
    litres: float | None
    kg: float | None
    is_money: bool
    entity_type: str
    entity_id: UUID | None


class JournalPageOut(CamelModel):
    """
    One page of the day's events, with the list's size.
    """

    items: list[JournalEventOut]
    total: int


class JournalDaySummaryOut(CamelModel):
    """
    The day at a glance, over the events the person may see.
    """

    receptions: int
    received_kg: float
    stored_litres: float
    discounts: int
    discount_dh: float
    collected_dh: float
    total: int
    group_counts: dict[ActivityGroup, int]
    people: list[str]
