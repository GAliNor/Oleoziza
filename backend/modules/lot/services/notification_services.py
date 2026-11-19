from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from core.exceptions import MessageDeliveryError
from core.integrations.mail.mail_client import MailClient
from modules.lot.models.lot_models import Lot, Notification
from modules.lot.types.lot_types import PRESSED_EMAIL_BODY, PRESSED_EMAIL_SUBJECT, NotificationStatus
from modules.site.models.site_models import Site


class NotificationService:
    """
    Sends the Lot notifications queued at pressing, through the channel they were recorded with (email for now).
    """

    def __init__(self, db: Session, mail: MailClient) -> None:
        """
        Bind the service to a session and the mail client.

        Args:
            db (Session): The task's own session.
            mail (MailClient): Shared SMTP client.
        """
        self.db = db
        self.mail = mail

    def send_notification(self, notification_id: UUID, is_last_attempt: bool) -> None:
        """
        Email one queued Notification and record it sent; a replay of a Notification no longer queued does nothing.

        Args:
            notification_id (UUID): Notification to send.
            is_last_attempt (bool): When true, a delivery error is recorded as failed instead of raised for a retry.

        Raises:
            MessageDeliveryError: When the mail server refused it and the task may retry.
        """
        notification = self.db.get(Notification, notification_id)
        if notification is None or notification.status != NotificationStatus.QUEUED:
            return
        lot = self.db.get(Lot, notification.lot_id)
        site = self.db.get(Site, lot.site_id) if lot else None
        if lot is None or site is None:
            return
        details = {"site": site.name, "code": lot.code or "", "litres": f"{float(lot.oil_in_litres or 0):g}".replace(".", ",")}
        try:
            self.mail.send(notification.sent_to, PRESSED_EMAIL_SUBJECT.format(**details), PRESSED_EMAIL_BODY.format(**details))
        except MessageDeliveryError as error:
            if not is_last_attempt:
                raise
            notification.status = NotificationStatus.FAILED
            notification.failure_reason = str(error) or "delivery_failed"
        else:
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now(timezone.utc)
        self.db.commit()
