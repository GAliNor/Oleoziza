import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import Depends
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.integrations.celery.celery_publisher import publish_task
from core.integrations.redis.redis_stream_client import RedisStreamClient, get_redis_stream_client
from core.security import get_current_manager
from core.types import CurrentUser
from modules.assistant.helpers.conversation_mapping import build_owner_key, build_stream_key, map_question
from modules.assistant.models.assistant_models import TITLE_LENGTH, AssistantConversation, AssistantQuestion
from modules.assistant.services.assistant_answer_services import pin_plan
from modules.assistant.types.assistant_types import ANSWER_TASK_NAME, AnswerKind, AssistantPlan, ChoiceIn, ConversationListItemOut, ConversationOut, ConversationPageOut, QuestionIn, QuestionOut, QuestionScope, QuestionStatus
from modules.site.business.site_scope import resolve_site_ids
from modules.site.models.site_models import Site
from modules.user.models.user_models import User
from modules.user.types.user_types import Permission


logger = logging.getLogger(__name__)

PENDING_TIMEOUT = timedelta(minutes=2)


class AssistantService:
    def __init__(self, db: Session, streams: RedisStreamClient, current_user: CurrentUser) -> None:
        """
        Own a Management User's Conversations: asking, choosing, retrying, rating, reading and clearing their own history.

        Args:
            db (Session): Request session.
            streams (RedisStreamClient): Replayable events.
            current_user (CurrentUser): The signed-in Management User.
        """
        self.db = db
        self.streams = streams
        self.current_user = current_user

    def ask(self, payload: QuestionIn) -> QuestionOut:
        """
        Save a question with its scope and queue its answer; a replayed id answers the stored question.

        Args:
            payload (QuestionIn): Question, Conversation, the id minted by the front, the Home's Site and period.

        Returns:
            QuestionOut: The pending question, or a recoverable queue failure.

        Raises:
            RefusedError: assistant_question_empty, assistant_request_conflict, site_forbidden, assistant_answer_pending.
        """
        self._lock_user()
        text = payload.text.strip()
        if not text:
            raise RefusedError("assistant_question_empty", 422)
        if payload.request_id is not None:
            existing = self.db.get(AssistantQuestion, payload.request_id)
            if existing is not None:
                if existing.conversation.user_id != self.current_user.id or existing.text != text:
                    raise RefusedError("assistant_request_conflict", 409)
                return map_question(existing)
        scope = self._build_scope(payload)
        if payload.conversation_id:
            conversation = self._get_own_conversation(payload.conversation_id)
            self._ensure_available(conversation.id)
        else:
            conversation = AssistantConversation(user_id=self.current_user.id, title=text[:TITLE_LENGTH])
            self.db.add(conversation)
        question = AssistantQuestion(id=payload.request_id or None, conversation=conversation, text=text, status=QuestionStatus.PENDING, scope=scope.model_dump(mode="json", by_alias=True))
        self.db.add(question)
        return self._queue(question)

    def choose(self, question_id: UUID, payload: ChoiceIn) -> QuestionOut:
        """
        Resume a clarify answer with one of the records it offered, without a new model call.

        Args:
            question_id (UUID): Question awaiting the choice.
            payload (ChoiceIn): Offered entity and record.

        Returns:
            QuestionOut: The question, pending again.

        Raises:
            RefusedError: assistant_choice_invalid.
        """
        self._lock_user()
        question = self._get_own_question(question_id)
        answer = question.answer or {}
        if question.status != QuestionStatus.ANSWERED or answer.get("kind") != AnswerKind.CLARIFY or not question.plan:
            raise RefusedError("assistant_choice_invalid", 409)
        if not any(item.get("entity") == payload.entity and item.get("recordId") == str(payload.record_id) for item in answer.get("choices", [])):
            raise RefusedError("assistant_choice_invalid", 422)
        self._ensure_available(question.conversation_id)
        question.plan = pin_plan(AssistantPlan.model_validate(question.plan), payload.entity, str(payload.record_id)).model_dump(mode="json", by_alias=True)
        return self._queue(question, {"entity": payload.entity, "recordId": str(payload.record_id)})

    def retry(self, question_id: UUID) -> QuestionOut:
        """
        Retry a failed question in place, without a second history entry.

        Args:
            question_id (UUID): Failed question.

        Returns:
            QuestionOut: The pending question.

        Raises:
            RefusedError: assistant_retry_unavailable.
        """
        self._lock_user()
        question = self._get_own_question(question_id)
        if question.status == QuestionStatus.PENDING:
            return map_question(question)
        if question.status != QuestionStatus.FAILED:
            raise RefusedError("assistant_retry_unavailable", 409)
        self._ensure_available(question.conversation_id)
        question.plan = None
        return self._queue(question)

    def rate(self, question_id: UUID, rating: int) -> QuestionOut:
        """
        Save the author's 👍 / 👎 on an answer.

        Args:
            question_id (UUID): Question.
            rating (int): 1, -1 or 0 to clear.

        Returns:
            QuestionOut: The question.
        """
        question = self._get_own_question(question_id)
        question.rating = rating or None
        self.db.commit()
        return map_question(question)

    def list_conversations(self, offset: int, limit: int) -> ConversationPageOut:
        """
        Page the author's own Conversations, latest first.

        Args:
            offset (int): Earlier results skipped.
            limit (int): Page size.

        Returns:
            ConversationPageOut: The page and the total.
        """
        owned = AssistantConversation.user_id == self.current_user.id
        total = self.db.scalar(select(func.count()).select_from(AssistantConversation).where(owned)) or 0
        rows = self.db.scalars(select(AssistantConversation).where(owned).order_by(AssistantConversation.updated_at.desc(), AssistantConversation.id.desc()).offset(offset).limit(limit))
        return ConversationPageOut(items=[ConversationListItemOut(id=row.id, title=row.title, updated_at=row.updated_at) for row in rows], total=total)

    def get_conversation(self, conversation_id: UUID) -> ConversationOut:
        """
        Reopen a Conversation's saved answers and re-authorize its pending stream.

        Args:
            conversation_id (UUID): Conversation.

        Returns:
            ConversationOut: Its questions and answers.
        """
        conversation = self._get_own_conversation(conversation_id)
        for question in conversation.questions:
            self._expire_pending(question)
            if question.status == QuestionStatus.PENDING:
                self.streams.set_value(build_owner_key(question.id), str(self.current_user.id))
        self.db.commit()
        return ConversationOut(id=conversation.id, title=conversation.title, questions=[map_question(item) for item in conversation.questions])

    def delete_conversation(self, conversation_id: UUID) -> None:
        """
        Delete one of the author's Conversations and close its streams.

        Args:
            conversation_id (UUID): Conversation.
        """
        self._lock_user()
        conversation = self._get_own_conversation(conversation_id)
        question_ids = list(self.db.scalars(select(AssistantQuestion.id).where(AssistantQuestion.conversation_id == conversation.id)))
        self.db.delete(conversation)
        self.db.commit()
        self._revoke_streams(question_ids)

    def clear_conversations(self) -> None:
        """
        Delete every Conversation of the author, pages not loaded included.
        """
        self._lock_user()
        owned = select(AssistantConversation.id).where(AssistantConversation.user_id == self.current_user.id)
        question_ids = list(self.db.scalars(select(AssistantQuestion.id).where(AssistantQuestion.conversation_id.in_(owned))))
        self.db.execute(delete(AssistantConversation).where(AssistantConversation.user_id == self.current_user.id))
        self.db.commit()
        self._revoke_streams(question_ids)

    def _build_scope(self, payload: QuestionIn) -> QuestionScope:
        """
        Freeze what the question may read: the Home's Site (or every Site held), the Home's period, and money only with finance-view on every one of those Sites (D4).

        Args:
            payload (QuestionIn): The question.

        Returns:
            QuestionScope: The scope.
        """
        site_ids = resolve_site_ids(self.db, self.current_user, [payload.site_id] if payload.site_id else [])
        names = {site_id: name for site_id, name in self.db.execute(select(Site.id, Site.name).where(Site.id.in_(site_ids)))}
        can_see_money = bool(site_ids) and all(self.current_user.has_permission(site_id, Permission.FINANCE_VIEW) for site_id in site_ids)
        return QuestionScope(site_ids=site_ids, site_names=[names[site_id] for site_id in site_ids if site_id in names], period=payload.period, can_see_money=can_see_money)

    def _queue(self, question: AssistantQuestion, choice: dict[str, str] | None = None) -> QuestionOut:
        """
        Commit a new attempt, then publish it to the assistant worker.

        Args:
            question (AssistantQuestion): New, retried or clarified question.
            choice (dict[str, str] | None): The chosen record, after clarify.

        Returns:
            QuestionOut: The saved question, queue failures included.
        """
        question.status, question.answer, question.error_code, question.rating = QuestionStatus.PENDING, None, None, None
        question.stream_cursor = f"starting:{uuid4().hex}"
        question.conversation.updated_at = datetime.now(timezone.utc)
        self.db.flush()
        question_id = question.id
        try:
            cursor = self.streams.publish(build_stream_key(question_id), "reset", {})
        except Exception:
            logger.warning("Assistant stream unavailable for question %s", question_id)
            question.status, question.error_code, question.stream_cursor = QuestionStatus.FAILED, "assistant_queue_unavailable", None
            self.db.commit()
            return map_question(question)
        question.stream_cursor = cursor
        self.db.commit()
        try:
            self.streams.set_value(build_owner_key(question_id), str(self.current_user.id))
            if not publish_task(ANSWER_TASK_NAME, str(question_id), choice, cursor):
                raise RuntimeError("assistant_queue_unavailable")
        except Exception:
            logger.warning("Assistant question %s could not be queued", question_id)
            self.db.rollback()
            self.db.execute(update(AssistantQuestion).where(AssistantQuestion.id == question_id, AssistantQuestion.status == QuestionStatus.PENDING).values(status=QuestionStatus.FAILED, error_code="assistant_queue_unavailable"))
            self.db.commit()
        saved = self.db.get(AssistantQuestion, question_id, populate_existing=True)
        if saved is None:
            raise RefusedError("assistant_question_not_found", 404)
        return map_question(saved)

    def _expire_pending(self, question: AssistantQuestion) -> None:
        """
        Fail a question left pending past the worker's hard deadline.

        Args:
            question (AssistantQuestion): Question being reopened.
        """
        if question.status == QuestionStatus.PENDING and datetime.now(timezone.utc) - question.updated_at > PENDING_TIMEOUT:
            question.status, question.error_code = QuestionStatus.FAILED, "assistant_timeout"

    def _ensure_available(self, conversation_id: UUID) -> None:
        """
        Accept a follow-up only once the previous answer is done.

        Args:
            conversation_id (UUID): Conversation receiving a question.

        Raises:
            RefusedError: assistant_answer_pending (409).
        """
        pending = self.db.scalar(select(AssistantQuestion).where(AssistantQuestion.conversation_id == conversation_id, AssistantQuestion.status == QuestionStatus.PENDING).limit(1))
        if pending is not None:
            self._expire_pending(pending)
            if pending.status == QuestionStatus.PENDING:
                raise RefusedError("assistant_answer_pending", 409)

    def _lock_user(self) -> None:
        """
        Serialize question starts and history deletion for one User.
        """
        self.db.execute(select(User.id).where(User.id == self.current_user.id).with_for_update())

    def _get_own_conversation(self, conversation_id: UUID) -> AssistantConversation:
        """
        Find a Conversation of the author, never another User's.

        Args:
            conversation_id (UUID): Conversation.

        Returns:
            AssistantConversation: The Conversation.

        Raises:
            RefusedError: assistant_conversation_not_found (404).
        """
        conversation = self.db.get(AssistantConversation, conversation_id)
        if conversation is None or conversation.user_id != self.current_user.id:
            raise RefusedError("assistant_conversation_not_found", 404)
        return conversation

    def _get_own_question(self, question_id: UUID) -> AssistantQuestion:
        """
        Find a question through its author's Conversation.

        Args:
            question_id (UUID): Question.

        Returns:
            AssistantQuestion: The question.

        Raises:
            RefusedError: assistant_question_not_found (404).
        """
        question = self.db.scalar(select(AssistantQuestion).join(AssistantConversation).where(AssistantQuestion.id == question_id, AssistantConversation.user_id == self.current_user.id))
        if question is None:
            raise RefusedError("assistant_question_not_found", 404)
        return question

    def _revoke_streams(self, question_ids: list[UUID]) -> None:
        """
        Close the streams of deleted questions; a transport failure never undoes the deletion.

        Args:
            question_ids (list[UUID]): Deleted questions.
        """
        for question_id in question_ids:
            try:
                self.streams.set_value(build_owner_key(question_id), "")
                self.streams.publish(build_stream_key(question_id), "error", {"code": "assistant_conversation_deleted"})
            except Exception:
                logger.warning("Assistant stream revocation unavailable for %s", question_id)


def get_assistant_service(db: Session = Depends(get_db), streams: RedisStreamClient = Depends(get_redis_stream_client), current_user: CurrentUser = Depends(get_current_manager)) -> AssistantService:
    """
    Build the Conversation service for one request, bound to the signed-in Management User (the Assistant is gated by the Role, not a Permission).

    Args:
        db (Session): Request session.
        streams (RedisStreamClient): Event streams.
        current_user (CurrentUser): Signed-in Management User.

    Returns:
        AssistantService: The service.
    """
    return AssistantService(db, streams, current_user)
