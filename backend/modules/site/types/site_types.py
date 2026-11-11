from enum import StrEnum


class SiteStatus(StrEnum):
    """
    Whether a mill is running or closed.
    """

    ACTIVE = "active"
    CLOSED = "closed"


class SeasonStatus(StrEnum):
    """
    Whether a harvest campaign is under way or closed.
    """

    OPEN = "open"
    CLOSED = "closed"


class CodeKind(StrEnum):
    """
    The records that carry a readable code, each counted in its own sequence per Site and Season.
    """

    LOT = "lot"
    PAYMENT = "payment"
    REFUND = "refund"
    WITHDRAWAL = "withdrawal"
    PAYOUT = "payout"
