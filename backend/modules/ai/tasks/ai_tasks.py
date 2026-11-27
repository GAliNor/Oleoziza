import logging

from core.database import SessionLocal
from core.integrations.celery.celery_app import celery_app
from modules.ai.services.ai_usage_services import AiUsageService


logger = logging.getLogger(__name__)

PURGE_EXPIRED_PAYLOADS_TASK = "ai.purge_expired_payloads"

PURGE_EXPIRED_PAYLOADS_EVERY_IN_SECONDS = 6 * 3600


@celery_app.task(name=PURGE_EXPIRED_PAYLOADS_TASK)
def purge_expired_payloads_task() -> int:
    """
    Delete every kept AI request and response past its AI Feature's keeping period. Safe to run twice.

    Returns:
        int: Number of payloads deleted.
    """
    with SessionLocal() as db:
        deleted = AiUsageService(db).purge_expired_payloads()
    logger.info("Purged %s expired AI payloads", deleted)
    return deleted


celery_app.conf.beat_schedule = {**(celery_app.conf.beat_schedule or {}), PURGE_EXPIRED_PAYLOADS_TASK: {"task": PURGE_EXPIRED_PAYLOADS_TASK, "schedule": PURGE_EXPIRED_PAYLOADS_EVERY_IN_SECONDS}}
