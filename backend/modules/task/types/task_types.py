from datetime import datetime
from enum import StrEnum
from uuid import UUID

from core.types import CamelModel


class TaskKind(StrEnum):
    """
    What waits on Management: a Discount or Payment to decide, a Refund to make or confirm, a Client who owes, an Invitation not accepted.
    """

    DISCOUNT = "discount"
    PAYMENT = "payment"
    REFUND_MAKE = "refund-make"
    REFUND_CONFIRM = "refund-confirm"
    CLIENT_AT_RISK = "client-at-risk"
    INVITATION = "invitation"


class TaskGroup(StrEnum):
    """
    Decisions first, then money to give back, then people to follow up.
    """

    DECIDE = "decide"
    MONEY = "money"
    FOLLOW = "follow"


class TaskOut(CamelModel):
    """
    One task, read from the record it comes from; the front links it from its kind and target.
    """

    id: str
    kind: TaskKind
    group: TaskGroup
    subject: str
    params: dict[str, str | int | float]
    amount: float | None
    at: datetime | None
    target_id: UUID
