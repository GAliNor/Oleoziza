from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from core.types import CamelModel


class LotMode(StrEnum):
    """
    Whether a Lot's olives are pressed for the Client (Service Milling) or bought by the mill (Purchase, deferred).
    """

    SERVICE_MILLING = "service_milling"
    PURCHASE = "purchase"


class LotStatus(StrEnum):
    """
    The steps of a Lot, moved only by its Pressing and its Withdrawals.
    """

    WAITING = "waiting"
    PRESSING = "pressing"
    PRESSED = "pressed"
    WITHDRAWN = "withdrawn"


class NotificationChoice(StrEnum):
    """
    How a Client wants to hear about one Lot, asked at Reception.
    """

    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    NONE = "none"


class PauseReason(StrEnum):
    """
    Why a Pressing stopped for a while.
    """

    BREAKDOWN = "breakdown"
    CLEANING = "cleaning"
    OTHER = "other"


class LotPhotoStep(StrEnum):
    """
    The step of a Lot a photo was taken at.
    """

    RECEPTION = "reception"
    PRESSING_STARTED = "pressing_started"
    PRESSED = "pressed"
    STORED = "stored"
    WITHDRAWAL = "withdrawal"


class NotificationEvent(StrEnum):
    """
    What a Client is told about their Lot.
    """

    PRESSED = "pressed"
    PAYMENT_CONFIRMED = "payment_confirmed"


class NotificationStatus(StrEnum):
    """
    What happened to a message sent to a Client.
    """

    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    SIMULATED = "simulated"


class LotMoveOut(CamelModel):
    """
    A status a Lot reached, with who moved it and when, derived from its Pressing and Withdrawals.
    """

    status: LotStatus
    at: datetime
    by: str


class LotStorageOut(CamelModel):
    """
    Some of a Lot's oil kept in one Tank, with what was already drawn from it.
    """

    id: UUID
    tank_id: UUID
    litres: float
    withdrawn_litres: float
    from_: date = Field(alias="from")
    planned_until: date | None
    ended_at: datetime | None
    by: str


class LotDiscountOut(CamelModel):
    """
    The Discount in force on a Lot's Milling Fee, or the last refused one.
    """

    amount_dh: float
    percent: float
    state: str
    given_by: str
    given_at: datetime
    decided_by: str | None = None
    decided_at: datetime | None = None
    refusal_reason: str | None = None


class LotNotificationOut(CamelModel):
    """
    A message the Client was sent about the Lot, or could not be sent.
    """

    event: NotificationEvent
    channel: str
    at: datetime
    is_failed: bool
    failure_reason: str | None = None


class LotOut(CamelModel):
    """
    A Lot as every screen reads it, built from its rows (Box Occupancies, Pressing, Storages, Withdrawals, Discount, Allocations) with names beside ids.
    """

    id: UUID
    code: str
    site_id: UUID
    client_id: UUID
    client_name: str
    mode: LotMode
    variety: str
    status: LotStatus
    net_kg: float
    oil_litres: float | None
    withdrawn_litres: float
    box_numbers: list[int]
    press_line_id: UUID | None
    planned_start_at: datetime | None
    storages: list[LotStorageOut]
    daily_price_per_kg: float | None
    milling_rate_per_kg: float
    discount: LotDiscountOut | None
    notification_choice: NotificationChoice
    is_contact_missing: bool
    notifications: list[LotNotificationOut]
    paid_dh: float
    pending_dh: float
    credit_dh: float
    moves: list[LotMoveOut]
    step_photos: dict[str, str]
    received_at: datetime
    received_by: str
    is_pending_sync: bool = False


class LotReceiveIn(CamelModel):
    """
    One Reception, typed by an Operator and possibly replayed from the outbox; the id is minted when the form opens.
    """

    id: UUID
    site_id: UUID
    client_id: UUID
    mode: LotMode
    variety: str = Field(min_length=1, max_length=64)
    net_kg: float = Field(gt=0)
    milling_rate_per_kg: float = Field(ge=0)
    notification_choice: NotificationChoice
    box_numbers: list[int] = Field(min_length=1)
    press_line_id: UUID
    planned_start_at: datetime
    entered_at: datetime | None = None
    recorded_offline: bool = False
    device_label: str | None = Field(default=None, max_length=120)


class TankPourIn(CamelModel):
    """
    One share of a Lot's oil going into one Tank at the end of its Pressing.
    """

    tank_id: UUID
    litres: float = Field(gt=0)


class LotMoveIn(CamelModel):
    """
    One step of a Lot: start its Pressing, end it (oil, handover, Tanks), or withdraw what is left; the id is the step's Audit Event, so a replay never moves it twice.
    """

    id: UUID
    oil_litres: float | None = Field(default=None, gt=0)
    press_line_id: UUID | None = None
    handed_litres: float | None = Field(default=None, ge=0)
    pours: list[TankPourIn] = []
    planned_until: date | None = None
    entered_at: datetime | None = None
    recorded_offline: bool = False
    device_label: str | None = Field(default=None, max_length=120)


class LotScheduleIn(CamelModel):
    """
    A waiting Lot moved to another Press Line or planned start.
    """

    id: UUID
    press_line_id: UUID
    planned_start_at: datetime


class DiscountGiftIn(CamelModel):
    """
    A Discount on a Lot's Milling Fee, typed as an amount and its percent; above the Discount Limit it waits for a decision.
    """

    id: UUID
    amount_dh: float = Field(gt=0)
    percent: float = Field(gt=0, le=100)


class DiscountDecisionIn(CamelModel):
    """
    Management's answer to a Discount above the limit.
    """

    id: UUID
    is_approved: bool
    reason: str | None = Field(default=None, max_length=500)


SEND_LOT_NOTIFICATION_TASK = "lot.send_notification"

CHANNEL_DISABLED_REASON = "channel_disabled"

CONTACT_MISSING_REASON = "contact_missing"

PRESSED_EMAIL_SUBJECT = "Votre huile est prête · {site}"

PRESSED_EMAIL_BODY = "Bonjour,\n\nVotre lot {code} a été pressé à {site} : {litres} L d'huile.\nVous pouvez venir la retirer.\n\n{site}"
