from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from core.types import CamelModel


class SiteStatus(StrEnum):
    """
    Whether a mill is running or closed.
    """

    ACTIVE = "active"
    CLOSED = "closed"


class SeasonStatus(StrEnum):
    """
    Where a harvest campaign stands: prepared ahead with its prices, under way, or closed.
    """

    PLANNED = "planned"
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


class SeasonArtVariant(StrEnum):
    """
    Which banner of a Season is uploaded: the daylight one, or the dusk one shown in dark mode.
    """

    LIGHT = "light"
    DARK = "dark"


class SeasonOut(CamelModel):
    id: UUID
    code: str
    label: str
    starts_on: date
    ends_on: date | None
    status: SeasonStatus
    closed_at: datetime | None
    illustration_url: str | None = None
    illustration_dark_url: str | None = None
