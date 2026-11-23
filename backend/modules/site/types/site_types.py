from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from core.types import CamelModel
from modules.territory.types.territory_types import LocationIn


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
    EXPENSE = "expense"


class SeasonArtVariant(StrEnum):
    """
    Which picture of a Season Illustration: the daylight one, or the dusk one shown in dark mode.
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
    season_illustration_id: UUID | None = None
    illustration_url: str | None = None
    illustration_dark_url: str | None = None


class SeasonDatesIn(CamelModel):
    """
    The first and last day of a Season.
    """

    starts_on: date
    ends_on: date


class SeasonIllustrationOut(CamelModel):
    """
    One available Season Illustration, as the Season form's picker shows it.
    """

    id: UUID
    code: str
    illustration_url: str
    illustration_dark_url: str


class SeasonIllustrationChoiceIn(CamelModel):
    """
    The Season Illustration a Season uses; None leaves it with the drawn sketch.
    """

    season_illustration_id: UUID | None = None


SITE_CODE_PATTERN = r"^[A-Z]{2}$"


class SiteOut(CamelModel):
    """
    A mill as the Sites page, the switcher and every Site label read it.
    """

    id: UUID
    code: str
    name: str
    province: str
    city: str
    address: str
    phone: str | None
    status: SiteStatus


class SiteCreateIn(CamelModel):
    """
    A new mill: its two-letter code, prefix of every human code, is set here and never changes.
    """

    code: str = Field(pattern=SITE_CODE_PATTERN)
    name: str = Field(min_length=1, max_length=120)
    location: LocationIn
    phone: str | None = Field(default=None, max_length=20)


class SiteUpdateIn(CamelModel):
    """
    What can change on a mill: everything but its code.
    """

    name: str = Field(min_length=1, max_length=120)
    location: LocationIn
    phone: str | None = Field(default=None, max_length=20)
