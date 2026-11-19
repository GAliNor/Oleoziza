import logging
from typing import Any

from kombu.exceptions import OperationalError

from core.integrations.celery.celery_app import celery_app


logger = logging.getLogger(__name__)

PUBLISH_RETRY_POLICY = {"max_retries": 1, "interval_start": 0, "interval_step": 0.2, "interval_max": 0.2}


def publish_task(task_name: str, *args: Any) -> bool:
    """
    Send a task to the broker by its registered name once the caller's transaction is committed, so services never import a task module; a broker failure is logged and never fails the request.

    Args:
        task_name (str): Registered name of the Celery task, such as auth.send_invitation.
        *args (Any): JSON arguments of the task, ids rather than objects.

    Returns:
        bool: True when the broker accepted the message, False when it was unreachable.
    """
    try:
        celery_app.send_task(task_name, args=args, retry=True, retry_policy=PUBLISH_RETRY_POLICY)
    except (OperationalError, OSError):
        logger.exception("Could not publish task %s", task_name)
        return False
    return True
