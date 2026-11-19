from datetime import datetime

from sqlalchemy.orm import Session

from modules.client.models.client_models import Client
from modules.configuration.business.notification_channels import list_enabled_notification_channels
from modules.configuration.types.configuration_types import NotificationChannel
from modules.lot.business.lot_views import is_contact_missing
from modules.lot.models.lot_models import Lot, Notification
from modules.lot.types.lot_types import CHANNEL_DISABLED_REASON, CONTACT_MISSING_REASON, NotificationChoice, NotificationEvent, NotificationStatus


def build_pressed_notification(db: Session, lot: Lot, now: datetime) -> Notification | None:
    """
    Decide the message telling a Client their oil is ready: not sent when the Lot's channel was switched off or the contact is missing, queued for an email, simulated otherwise.

    Args:
        db (Session): Session to read with.
        lot (Lot): Lot just pressed.
        now (datetime): When it was pressed.

    Returns:
        Notification | None: The Notification to add, or None when the Client asked for none.
    """
    if lot.notification_choice == NotificationChoice.NONE:
        return None
    channel = NotificationChannel(lot.notification_choice.value)
    client = db.get(Client, lot.client_id)
    contact = (client.email if channel == NotificationChannel.EMAIL else client.phone) if client else None
    failure_reason = None
    if channel not in list_enabled_notification_channels(db):
        failure_reason = CHANNEL_DISABLED_REASON
    elif is_contact_missing(lot.notification_choice, client):
        failure_reason = CONTACT_MISSING_REASON
    if failure_reason:
        status = NotificationStatus.FAILED
    else:
        status = NotificationStatus.QUEUED if channel == NotificationChannel.EMAIL else NotificationStatus.SIMULATED
    return Notification(lot_id=lot.id, event=NotificationEvent.PRESSED, channel=channel, sent_to=contact or "", sent_at=now, status=status, failure_reason=failure_reason)
