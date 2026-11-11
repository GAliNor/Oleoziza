import logging
from typing import Any

from celery import Task
from kombu.exceptions import OperationalError


logger = logging.getLogger(__name__)

PUBLISH_RETRY_POLICY = {"max_retries": 1, "interval_start": 0, "interval_step": 0.2, "interval_max": 0.2}


def publish_task(task: Task, *args: Any) -> bool:
    """
    Send a task to the broker once the caller's transaction is committed; a broker failure is logged and never fails the request.

    Args:
        task (Task): Celery task to run.
        *args (Any): JSON arguments of the task, ids rather than objects.

    Returns:
        bool: True when the broker accepted the message, False when it was unreachable.
    """
    try:
        task.apply_async(args=args, retry=True, retry_policy=PUBLISH_RETRY_POLICY)
    except (OperationalError, OSError):
        logger.exception("Could not publish task %s with %s", task.name, args)
        return False
    return True
