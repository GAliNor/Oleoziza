from typing import Any

from celery import Celery
from celery.signals import worker_init, worker_process_init
from sqlalchemy.orm import configure_mappers

from core.app_init import MODULES_DIRECTORY, init_models
from core.config import get_settings
from core.database import engine


RESULT_EXPIRY_IN_SECONDS = 86_400


def build_task_module_names() -> list[str]:
    """
    Discover every modules/<module>/tasks/*_tasks.py as a dotted import path, the way routers are discovered.

    Returns:
        list[str]: Import paths of the task modules, sorted.
    """
    return [f"modules.{tasks_file.parent.parent.name}.tasks.{tasks_file.stem}" for tasks_file in sorted(MODULES_DIRECTORY.glob("*/tasks/*_tasks.py"))]


def create_celery_app() -> Celery:
    """
    Build the Celery app on Redis: JSON only, late acknowledgement, one task prefetched per process, short broker timeouts so a publish never hangs a request.

    Returns:
        Celery: The configured Celery app.
    """
    settings = get_settings()
    celery = Celery("oleoziza", broker=settings.celery_broker_url, backend=settings.celery_result_backend_url, include=build_task_module_names())
    celery.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        task_ignore_result=True,
        worker_prefetch_multiplier=1,
        broker_connection_retry_on_startup=True,
        broker_connection_timeout=settings.CELERY_BROKER_TIMEOUT_IN_SECONDS,
        broker_transport_options={
            "visibility_timeout": settings.CELERY_VISIBILITY_TIMEOUT_IN_SECONDS,
            "socket_connect_timeout": settings.CELERY_BROKER_TIMEOUT_IN_SECONDS,
            "socket_timeout": settings.CELERY_BROKER_TIMEOUT_IN_SECONDS,
        },
        result_expires=RESULT_EXPIRY_IN_SECONDS,
    )
    return celery


celery_app = create_celery_app()


@worker_init.connect
def configure_models_on_worker_start(**kwargs: Any) -> None:
    """
    Register and configure every SQLAlchemy mapper before the worker forks, so a broken mapping fails at boot rather than mid-task.

    Args:
        **kwargs (Any): Signal arguments, unused.
    """
    init_models()
    configure_mappers()


@worker_process_init.connect
def reset_database_pool_in_child(**kwargs: Any) -> None:
    """
    Drop the database connections a forked worker process inherited, without closing them for the parent.

    Args:
        **kwargs (Any): Signal arguments, unused.
    """
    engine.dispose(close=False)
