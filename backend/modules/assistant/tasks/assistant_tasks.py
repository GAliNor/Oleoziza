from typing import Any
from uuid import UUID

from core.database import SessionLocal
from core.integrations.celery.celery_app import celery_app
from core.integrations.fernet.fernet_client import get_secret_box
from core.integrations.openai_chat.openai_chat_client import get_openai_chat_client
from core.integrations.redis.redis_stream_client import get_redis_stream_client
from modules.ai.services.ai_call_services import AiCallService
from modules.assistant.services.assistant_answer_services import AssistantAnswerService
from modules.assistant.types.assistant_types import ANSWER_TASK_NAME


@celery_app.task(name=ANSWER_TASK_NAME, acks_late=False, soft_time_limit=60, time_limit=75)
def answer_question_task(question_id: str, choice: dict[str, Any] | None, cursor: str | None = None) -> None:
    """
    Answer one Assistant question on the assistant queue, away from the API and the other tasks.

    Args:
        question_id (str): Question id.
        choice (dict[str, Any] | None): The record picked after a clarify answer.
        cursor (str | None): Replay boundary of this attempt.
    """
    with SessionLocal() as db:
        AssistantAnswerService(db, get_redis_stream_client(), AiCallService(db, get_secret_box(), get_openai_chat_client())).answer(UUID(question_id), choice, cursor)
