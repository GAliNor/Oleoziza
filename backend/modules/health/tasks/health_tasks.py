from core.integrations.celery.celery_app import celery_app


@celery_app.task(name="health.ping")
def ping_task() -> str:
    """
    Answer from a worker, to check that the broker and the workers are alive.

    Returns:
        str: Always "pong".
    """
    return "pong"
