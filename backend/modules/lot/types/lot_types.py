from enum import StrEnum


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

    SENT = "sent"
    FAILED = "failed"
    SIMULATED = "simulated"
