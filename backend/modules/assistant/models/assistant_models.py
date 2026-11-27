from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from core.model_mixins import IdMixin, TimestampMixin, build_enum_type
from modules.assistant.types.assistant_types import QuestionStatus


TITLE_LENGTH = 120

CODE_LENGTH = 64

CURSOR_LENGTH = 80


class AssistantConversation(IdMixin, TimestampMixin, Base):
    """
    One thread of questions a Management User asked the Assistant; only its author sees it.
    """

    __tablename__ = "assistant_conversations"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(TITLE_LENGTH))

    questions: Mapped[list["AssistantQuestion"]] = relationship(back_populates="conversation", order_by="AssistantQuestion.created_at", cascade="all, delete-orphan")


class AssistantQuestion(IdMixin, TimestampMixin, Base):
    """
    One question and its answer. Its scope, plan and answer are frozen JSON snapshots (exempt from the no-lists rule, like Audit snapshots): the Sites and period it was asked for, the queries the model returned (never rows), and the answer as shown.
    """

    __tablename__ = "assistant_questions"

    conversation_id: Mapped[UUID] = mapped_column(ForeignKey("assistant_conversations.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    status: Mapped[QuestionStatus] = mapped_column(build_enum_type(QuestionStatus, "assistant_question_status"), default=QuestionStatus.PENDING)
    scope: Mapped[dict[str, Any]] = mapped_column(JSONB)
    plan: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    answer: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error_code: Mapped[str | None] = mapped_column(String(CODE_LENGTH))
    stream_cursor: Mapped[str | None] = mapped_column(String(CURSOR_LENGTH))
    rating: Mapped[int | None] = mapped_column(SmallInteger)
    ai_call_id: Mapped[UUID | None] = mapped_column(ForeignKey("ai_calls.id", ondelete="SET NULL"))

    conversation: Mapped[AssistantConversation] = relationship(back_populates="questions")
