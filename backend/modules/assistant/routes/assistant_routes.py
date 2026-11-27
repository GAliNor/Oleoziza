from collections.abc import AsyncIterator
from time import monotonic
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse

from core.exceptions import RefusedError
from core.integrations.redis.redis_stream_client import RedisStreamClient, get_redis_stream_client
from core.security import get_current_manager
from core.types import CurrentUser
from modules.assistant.helpers.conversation_mapping import build_owner_key, build_stream_key
from modules.assistant.services.assistant_services import AssistantService, get_assistant_service
from modules.assistant.services.assistant_voice_services import AssistantVoiceService, get_assistant_voice_service
from modules.assistant.types.assistant_types import ChoiceIn, ConversationOut, ConversationPageOut, FeedbackIn, QuestionIn, QuestionOut, TranscriptionOut


router = APIRouter(tags=["assistant"])

FINAL_EVENTS = {"done", "error"}

STREAM_LIMIT_IN_SECONDS = 90


@router.post("/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def ask_question(payload: QuestionIn, assistant_service: AssistantService = Depends(get_assistant_service)) -> QuestionOut:
    """
    Ask the Assistant (Management); the answer streams on GET /questions/{id}/events.

    Args:
        payload (QuestionIn): Question, Conversation, the id minted by the front, the Home's Site and period.
        assistant_service (AssistantService): Injected service.

    Returns:
        QuestionOut: The pending question.
    """
    return assistant_service.ask(payload)


@router.post("/questions/{question_id}/choice", response_model=QuestionOut)
def choose_record(question_id: UUID, payload: ChoiceIn, assistant_service: AssistantService = Depends(get_assistant_service)) -> QuestionOut:
    """
    Pick the record a clarify answer offered; the answer streams again on the same events.

    Args:
        question_id (UUID): Question.
        payload (ChoiceIn): Chosen record.
        assistant_service (AssistantService): Injected service.

    Returns:
        QuestionOut: The question, pending.
    """
    return assistant_service.choose(question_id, payload)


@router.post("/questions/{question_id}/retry", response_model=QuestionOut)
def retry_question(question_id: UUID, assistant_service: AssistantService = Depends(get_assistant_service)) -> QuestionOut:
    """
    Retry a failed question in place.

    Args:
        question_id (UUID): Failed question.
        assistant_service (AssistantService): Injected service.

    Returns:
        QuestionOut: The pending question.
    """
    return assistant_service.retry(question_id)


@router.put("/questions/{question_id}/feedback", response_model=QuestionOut)
def rate_answer(question_id: UUID, payload: FeedbackIn, assistant_service: AssistantService = Depends(get_assistant_service)) -> QuestionOut:
    """
    Rate an answer 👍 / 👎.

    Args:
        question_id (UUID): Question.
        payload (FeedbackIn): -1, 0 or 1.
        assistant_service (AssistantService): Injected service.

    Returns:
        QuestionOut: The question.
    """
    return assistant_service.rate(question_id, payload.rating)


@router.get("/questions/{question_id}/events")
async def stream_events(
    question_id: UUID,
    current_user: CurrentUser = Depends(get_current_manager),
    streams: RedisStreamClient = Depends(get_redis_stream_client),
    last_event_id: str | None = Header(default=None),
) -> StreamingResponse:
    """
    Stream a question's answer as server-sent events (stage, plan, message.delta, block, choices, done, error); holds no database session.

    Args:
        question_id (UUID): Question.
        current_user (CurrentUser): Its author.
        streams (RedisStreamClient): Event streams.
        last_event_id (str | None): Resume after this event.

    Returns:
        StreamingResponse: text/event-stream.

    Raises:
        RefusedError: assistant_question_not_found (404).
    """
    if await streams.get_value(build_owner_key(question_id)) != str(current_user.id):
        raise RefusedError("assistant_question_not_found", 404)

    async def generate() -> AsyncIterator[str]:
        started_at = monotonic()
        async for item in streams.read(build_stream_key(question_id), last_event_id or "0"):
            if monotonic() - started_at > STREAM_LIMIT_IN_SECONDS:
                return
            if item is None:
                if await streams.get_value(build_owner_key(question_id)) != str(current_user.id):
                    return
                yield ": ping\n\n"
                continue
            event_id, event, data = item
            yield f"id: {event_id}\nevent: {event}\ndata: {data}\n\n"
            if event in FINAL_EVENTS:
                return

    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/transcriptions", response_model=TranscriptionOut)
def transcribe_question(
    audio: UploadFile = File(...),
    duration_in_seconds: float = Form(..., alias="durationInSeconds"),
    assistant_voice_service: AssistantVoiceService = Depends(get_assistant_voice_service),
) -> TranscriptionOut:
    """
    Turn a dictated question into text the User checks before sending (Management).

    Args:
        audio (UploadFile): Recording (webm or mp4 from the browser), at most a minute.
        duration_in_seconds (float): Its length.
        assistant_voice_service (AssistantVoiceService): Injected service.

    Returns:
        TranscriptionOut: The transcript.
    """
    return assistant_voice_service.transcribe(audio.file.read(), audio.filename or "", audio.content_type or "", duration_in_seconds)


@router.get("/conversations", response_model=ConversationPageOut)
def list_conversations(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    assistant_service: AssistantService = Depends(get_assistant_service),
) -> ConversationPageOut:
    """
    Page the User's own Conversations, latest first.

    Args:
        offset (int): Earlier results skipped.
        limit (int): Page size.
        assistant_service (AssistantService): Injected service.

    Returns:
        ConversationPageOut: The page and the total.
    """
    return assistant_service.list_conversations(offset, limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: UUID, assistant_service: AssistantService = Depends(get_assistant_service)) -> ConversationOut:
    """
    Reopen one of the User's Conversations.

    Args:
        conversation_id (UUID): Conversation.
        assistant_service (AssistantService): Injected service.

    Returns:
        ConversationOut: Its questions and saved answers.
    """
    return assistant_service.get_conversation(conversation_id)


@router.delete("/conversations", status_code=status.HTTP_204_NO_CONTENT)
def clear_conversations(assistant_service: AssistantService = Depends(get_assistant_service)) -> Response:
    """
    Delete every Conversation of the User.

    Args:
        assistant_service (AssistantService): Injected service.

    Returns:
        Response: 204.
    """
    assistant_service.clear_conversations()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: UUID, assistant_service: AssistantService = Depends(get_assistant_service)) -> Response:
    """
    Delete one of the User's Conversations.

    Args:
        conversation_id (UUID): Conversation.
        assistant_service (AssistantService): Injected service.

    Returns:
        Response: 204.
    """
    assistant_service.delete_conversation(conversation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
