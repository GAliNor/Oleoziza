from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from core.types import CamelModel
from modules.lot.types.lot_types import LotStatus
from modules.territory.types.territory_types import OptionalLocationIn
from modules.user.types.user_types import Title


class ClientKind(StrEnum):
    """
    Whether a Client is a private person or a legal entity.
    """

    INDIVIDUAL = "individual"
    COMPANY = "company"


class ClientStatus(StrEnum):
    """
    Whether a Client is in use or was merged into another after an offline duplicate.
    """

    ACTIVE = "active"
    MERGED = "merged"


class ClientFollowUp(StrEnum):
    """
    How Management should look at a Client: came this Season, owes money, or hasn't come this Season.
    """

    ACTIVE = "active"
    AT_RISK = "at-risk"
    INACTIVE = "inactive"


class ClientOut(CamelModel):
    """
    A Client as the pickers, the search and the Operator screens read it, light enough to keep the whole list on the phone.
    """

    id: UUID
    kind: ClientKind
    name: str
    title: Title | None
    first_name: str | None
    last_name: str | None
    legal_name: str | None
    phone: str
    email: str | None
    identifier: str | None
    credit_dh: float
    site_ids: list[UUID]
    is_pending_sync: bool = False


class ClientCreateIn(CamelModel):
    """
    A new Client typed at Reception or on the Clients page; the id is minted when the form opens, so a replay answers the same Client.
    """

    id: UUID
    kind: ClientKind
    title: Title | None = None
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    legal_name: str | None = Field(default=None, max_length=120)
    phone: str = Field(min_length=6, max_length=20)
    site_id: UUID
    identifier: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=254)
    location: OptionalLocationIn | None = None
    entered_at: datetime | None = None
    recorded_offline: bool = False
    device_label: str | None = Field(default=None, max_length=120)


class ClientContactIn(CamelModel):
    """
    A Client's phone, email or place, changed from their page; a place left out stays, an empty one is removed.
    """

    phone: str | None = Field(default=None, min_length=6, max_length=20)
    email: str | None = Field(default=None, max_length=254)
    location: OptionalLocationIn | None = None


class ClientLotLineOut(CamelModel):
    """
    One past Lot of a Client, as their history lists it.
    """

    id: UUID
    code: str
    site_id: UUID
    site_name: str
    status: LotStatus
    kg: float
    oil_litres: float
    milling_rate_per_kg: float
    variety: str
    season: str
    received_on: date


class ClientSiteFiguresOut(CamelModel):
    """
    What a Client holds and owes on one Site.
    """

    site_id: UUID
    site_name: str
    oil_stock_litres: float
    balance: float


class ClientRecordOut(CamelModel):
    """
    A Client as Management's register reads it, across every Site, with the figures derived from Lots and Payments.
    """

    id: UUID
    name: str
    kind: ClientKind
    follow_up: ClientFollowUp
    phone: str
    identifier: str
    region: str
    province: str | None
    address: str | None
    email: str | None
    oil_stock_litres: float
    balance: float
    sites: list[ClientSiteFiguresOut]
    history: list[ClientLotLineOut]


class ClientAccountLineOut(CamelModel):
    """
    One Lot of the open Season on a Client's account.
    """

    code: str
    status: LotStatus
    kg: float


class ClientAccountOut(CamelModel):
    """
    What a Client holds and owes now, as the Operator and the Client page show it.
    """

    oil_stock_litres: float
    due_dh: float
    pending_dh: float
    payout_dh: float
    history: list[ClientAccountLineOut]
