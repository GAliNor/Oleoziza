from uuid import UUID

from core.database import SessionLocal
from core.exceptions import MessageDeliveryError
from core.integrations.celery.celery_app import celery_app
from modules.auth.services.invitation_services import InvitationService


INVITATION_MAX_RETRIES = 5

INVITATION_RETRY_BACKOFF_MAX_IN_SECONDS = 600


@celery_app.task(
    name="auth.send_invitation",
    autoretry_for=(MessageDeliveryError,),
    retry_backoff=True,
    retry_backoff_max=INVITATION_RETRY_BACKOFF_MAX_IN_SECONDS,
    retry_jitter=True,
    max_retries=INVITATION_MAX_RETRIES,
)
def send_invitation_task(invitation_id: str, token: str) -> None:
    """
    Send one Invitation's link, retried while the mail server is unreachable.

    Args:
        invitation_id (str): Invitation to send.
        token (str): Its plain token.
    """
    with SessionLocal() as db:
        InvitationService(db).send_invitation(UUID(invitation_id), token)
