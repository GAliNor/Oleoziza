from enum import StrEnum


class StorageOwner(StrEnum):
    """
    Who the oil kept in a Storage belongs to.
    """

    CLIENT = "client"
    MILL = "mill"


class StorageDrawReason(StrEnum):
    """
    Why oil left a Storage.
    """

    WITHDRAWAL = "withdrawal"
    OIL_PAYMENT = "oil_payment"
    SALE = "sale"


class WithdrawalKind(StrEnum):
    """
    Whether oil was handed straight into the Client's containers at the end of the Pressing, or taken out of storage later.
    """

    HANDOVER = "handover"
    WITHDRAWAL = "withdrawal"
