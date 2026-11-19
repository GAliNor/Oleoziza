from typing import Any
from uuid import UUID

from core.database import SessionLocal
from core.exceptions import MessageDeliveryError
from core.integrations.celery.celery_app import celery_app
from core.integrations.mail.mail_client import get_mail_client
from modules.lot.services.notification_services import NotificationService
from modules.lot.types.lot_types import SEND_LOT_NOTIFICATION_TASK


NOTIFICATION_MAX_RETRIES = 5

NOTIFICATION_RETRY_DELAY_IN_SECONDS = 60


@celery_app.task(name=SEND_LOT_NOTIFICATION_TASK, bind=True, max_retries=NOTIFICATION_MAX_RETRIES)
def send_lot_notification_task(self: Any, notification_id: str) -> None:
    """
    Send one queued Lot notification, retried while the mail server refuses it, then recorded as failed.

    Args:
        self (Any): The bound Celery task, for its retry count.
        notification_id (str): Notification to send.
    """
    with SessionLocal() as db:
        try:
            NotificationService(db, get_mail_client()).send_notification(UUID(notification_id), is_last_attempt=self.request.retries >= NOTIFICATION_MAX_RETRIES)
        except MessageDeliveryError as error:
            raise self.retry(exc=error, countdown=NOTIFICATION_RETRY_DELAY_IN_SECONDS * (self.request.retries + 1)) from error
