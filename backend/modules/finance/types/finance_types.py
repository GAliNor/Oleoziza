from enum import StrEnum


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
