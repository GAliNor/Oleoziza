from unittest.mock import MagicMock

from kombu.exceptions import OperationalError
from sqlalchemy.orm import configure_mappers

from core.app_init import init_models
from core.integrations.celery.celery_app import build_task_module_names, celery_app
from core.integrations.celery.celery_publisher import publish_task
from modules.health.tasks.health_tasks import ping_task


def test_task_modules_are_discovered_from_every_module() -> None:
    """
    Every modules/<module>/tasks/*_tasks.py is listed in the app's include, like routers are discovered.
    """
    assert "modules.health.tasks.health_tasks" in build_task_module_names()
    assert list(celery_app.conf.include) == build_task_module_names()


def test_app_is_json_only_with_late_acknowledgement() -> None:
    """
    The app refuses pickled payloads and acknowledges a message only once its task finished.
    """
    assert celery_app.conf.accept_content == ["json"]
    assert celery_app.conf.task_acks_late is True
    assert celery_app.conf.worker_prefetch_multiplier == 1


def test_every_model_maps_at_worker_boot() -> None:
    """
    All mappers configure cleanly once every model is imported, as the worker does at boot.
    """
    init_models()
    configure_mappers()


def test_ping_task_answers_pong() -> None:
    """
    The health task answers without a broker when called directly.
    """
    assert ping_task.run() == "pong"


def test_publish_task_sends_the_arguments() -> None:
    """
    A reachable broker receives the task with its arguments and the publish reports success.
    """
    task = MagicMock()
    assert publish_task(task, 42) is True
    task.apply_async.assert_called_once()
    assert task.apply_async.call_args.kwargs["args"] == (42,)


def test_publish_task_never_raises_when_the_broker_is_down() -> None:
    """
    An unreachable broker is logged and reported as False instead of failing the request.
    """
    task = MagicMock()
    task.name = "health.ping"
    task.apply_async.side_effect = OperationalError("Connection refused")
    assert publish_task(task) is False
