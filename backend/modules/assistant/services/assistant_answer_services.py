import logging
import time
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from core.exceptions import RefusedError
from core.integrations.redis.redis_stream_client import RedisStreamClient
from modules.ai.services.ai_call_services import AiCallService, CallContext, StructuredPrompt
from modules.ai.types.ai_types import AiFeature
from modules.assistant.business.date_rules import PeriodContext
from modules.assistant.business.period_context import load_period_context
from modules.assistant.business.plan_rules import normalize_plan
from modules.assistant.business.plan_runner import PlanResults, describe_rows, run_plan
from modules.assistant.business.query_compiler import QueryScope, pin_record
from modules.assistant.helpers.answer_method import build_answer_method, clean_suggestions
from modules.assistant.helpers.answer_rendering import build_block, build_calc_block, fill_message, split_message
from modules.assistant.helpers.assistant_playbook import MAXIMUM_OUTPUT_TOKENS, PLAN_SCHEMA, SYSTEM_PROMPT, build_second_round_note, build_user_prompt
from modules.assistant.helpers.conversation_mapping import FINANCE_HIDDEN_MESSAGES, MISSING_RECORD_MESSAGES, build_notice_answer, build_stream_key, map_question
from modules.assistant.models.assistant_models import AssistantQuestion
from modules.assistant.types.assistant_types import (
    ASSISTANT_RECORD_TYPE,
    DIGEST_COLUMNS,
    DIGEST_ROWS,
    DIGEST_TEXT_LENGTH,
    HISTORY_SIZE,
    AnswerChoice,
    AnswerKind,
    AnswerScope,
    AssistantAnswer,
    AssistantPlan,
    QuestionScope,
    QuestionStatus,
)


logger = logging.getLogger(__name__)

STATEMENT_TIMEOUT_IN_MILLISECONDS = 5000

DELTA_PAUSE_IN_SECONDS = 0.035

MAXIMUM_CHOICES = 8


class AssistantAnswerService:
    def __init__(self, db: Session, streams: RedisStreamClient, ai_call_service: AiCallService) -> None:
        """
        Answer one question on the worker: plan with the model (one round, two at most), run the plan read-only, save the answer, then stream it.

        Args:
            db (Session): Worker session.
            streams (RedisStreamClient): Replayable events.
            ai_call_service (AiCallService): Budgeted model gateway.
        """
        self.db = db
        self.streams = streams
        self.ai_call_service = ai_call_service

    def answer(self, question_id: UUID, choice: dict[str, Any] | None, cursor: str | None) -> None:
        """
        Answer a pending question without restoring deleted or superseded work.

        Args:
            question_id (UUID): Question id.
            choice (dict[str, Any] | None): The record picked after a clarify answer.
            cursor (str | None): Replay boundary of this attempt.
        """
        question = self.db.get(AssistantQuestion, question_id)
        if question is None or question.status != QuestionStatus.PENDING or question.stream_cursor != cursor:
            return
        scope = QuestionScope.model_validate(question.scope)
        query_scope = QueryScope(site_ids=scope.site_ids, can_see_money=scope.can_see_money)
        context = load_period_context(self.db)
        try:
            self._publish(question_id, "stage", {"stage": "understanding"}, cursor)
            plan = self._get_plan(question, scope, query_scope, context, choice, cursor)
            answer = self._build_answer(question_id, plan, query_scope, context, cursor)
            answer.suggestions = clean_suggestions(plan.suggestions, question.text)
            answer.scope = AnswerScope(site_names=scope.site_names, period=scope.period)
            answer.computed_at = datetime.now(timezone.utc)
            saved = self.db.execute(
                update(AssistantQuestion).where(*self._attempt_filters(question_id, cursor)).values(answer=answer.model_dump(mode="json", by_alias=True), status=QuestionStatus.ANSWERED, error_code=None).returning(AssistantQuestion.id)
            ).scalar_one_or_none()
            self.db.commit()
            completed = self.db.get(AssistantQuestion, question_id, populate_existing=True) if saved else None
            if completed is not None and completed.stream_cursor == cursor:
                self._publish_answer(completed, answer, cursor)
        except RefusedError as error:
            self._fail(question_id, cursor, error.code)
        except Exception:
            logger.exception("Assistant question %s failed", question_id)
            self._fail(question_id, cursor, "assistant_failed")

    def _get_plan(self, question: AssistantQuestion, scope: QuestionScope, query_scope: QueryScope, context: PeriodContext, choice: dict[str, Any] | None, cursor: str | None) -> AssistantPlan:
        """
        Get a runnable plan: the saved one after a choice, else one model call, plus a second when the plan asks to see results first.

        Args:
            question (AssistantQuestion): Stored question.
            scope (QuestionScope): Scope saved at asking time.
            query_scope (QueryScope): Sites and money visibility for queries.
            context (PeriodContext): Today and Season starts.
            choice (dict[str, Any] | None): Choice after clarify.
            cursor (str | None): Current attempt.

        Returns:
            AssistantPlan: The normalized plan.

        Raises:
            RefusedError: assistant_plan_invalid, assistant_question_not_found.
        """
        if choice and question.plan:
            return AssistantPlan.model_validate(question.plan)
        user_prompt = build_user_prompt(question.text, self._load_history(question), context.today, self._describe_scope(scope))
        plan = self._ask_model(question, user_prompt, scope, query_scope, context, cursor)
        if plan.next is not None and plan.kind == AnswerKind.ANSWER:
            self._publish(question.id, "stage", {"stage": "searching", "entities": [query.entity for query in plan.queries]}, cursor)
            results = self._run_read_only(plan, query_scope, context)
            digest = describe_rows(results, list(plan.next.sees), DIGEST_ROWS, DIGEST_COLUMNS, DIGEST_TEXT_LENGTH)
            self._publish(question.id, "stage", {"stage": "deepening"}, cursor)
            plan = self._ask_model(question, user_prompt + build_second_round_note(digest, plan.next.why), scope, query_scope, context, cursor)
            plan = plan.model_copy(update={"next": None})
        saved = self.db.execute(update(AssistantQuestion).where(*self._attempt_filters(question.id, cursor)).values(plan=plan.model_dump(mode="json", by_alias=True))).rowcount
        self.db.commit()
        if not saved:
            raise RefusedError("assistant_question_not_found", 404)
        return plan

    def _ask_model(self, question: AssistantQuestion, user_prompt: str, scope: QuestionScope, query_scope: QueryScope, context: PeriodContext, cursor: str | None) -> AssistantPlan:
        """
        Make one structured model call, retrying once with the reason when the plan does not validate.

        Args:
            question (AssistantQuestion): Stored question.
            user_prompt (str): The changing tail of the prompt.
            scope (QuestionScope): Scope saved at asking time.
            query_scope (QueryScope): Sites and money visibility.
            context (PeriodContext): Today and Season starts.
            cursor (str | None): Current attempt.

        Returns:
            AssistantPlan: A normalized, compilable plan.

        Raises:
            RefusedError: assistant_plan_invalid (422), assistant_question_not_found (404).
        """
        call_context = CallContext(feature=AiFeature.ASSISTANT, user_id=question.conversation.user_id, record_type=ASSISTANT_RECORD_TYPE, record_id=question.id)
        error_note = ""
        for _ in range(2):
            if self.db.scalar(select(AssistantQuestion.id).where(*self._attempt_filters(question.id, cursor))) is None:
                raise RefusedError("assistant_question_not_found", 404)
            result = self.ai_call_service.run_structured(call_context, StructuredPrompt(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt + error_note, schema_name="assistant_plan", json_schema=PLAN_SCHEMA, max_output_tokens=MAXIMUM_OUTPUT_TOKENS))
            try:
                plan = normalize_plan(AssistantPlan.model_validate(result.content), context, scope.period)
                self.db.execute(update(AssistantQuestion).where(AssistantQuestion.id == question.id).values(ai_call_id=result.call_id))
                self.db.commit()
                return plan
            except (ValidationError, RefusedError, ValueError) as error:
                details = getattr(error, "details", None) or str(error)[:300]
                error_note = f"\nInvalid plan ({getattr(error, 'code', 'schema')}: {details}). Use declared names and valid bindings."
        raise RefusedError("assistant_plan_invalid", 422)

    def _build_answer(self, question_id: UUID, plan: AssistantPlan, query_scope: QueryScope, context: PeriodContext, cursor: str | None) -> AssistantAnswer:
        """
        Run the plan and turn its results into the message, blocks or choices.

        Args:
            question_id (UUID): Question id.
            plan (AssistantPlan): Normalized plan.
            query_scope (QueryScope): Sites and money visibility.
            context (PeriodContext): Today and Season starts.
            cursor (str | None): Current attempt.

        Returns:
            AssistantAnswer: The answer to save.
        """
        if plan.kind != AnswerKind.ANSWER:
            return AssistantAnswer(kind=plan.kind, message=plan.message)
        self._publish(question_id, "plan", {"blocks": [{"type": block.type.value, "title": block.title} for block in plan.blocks]}, cursor)
        self._publish(question_id, "stage", {"stage": "searching", "entities": list(dict.fromkeys(query.entity for query in plan.queries))}, cursor)
        try:
            results = self._run_read_only(plan, query_scope, context)
        except RefusedError as error:
            if error.code == "assistant_finance_forbidden":
                return build_notice_answer(plan.language, FINANCE_HIDDEN_MESSAGES)
            raise
        if results.stop_reason == "missing":
            return build_notice_answer(plan.language, MISSING_RECORD_MESSAGES)
        if results.stop_reason == "clarify" and results.stop_query:
            compiled, rows = results.stop_query
            return AssistantAnswer(kind=AnswerKind.CLARIFY, message="", choices=[AnswerChoice(entity=compiled.entity.name, record_id=str(row["_id"]), label=str(row["_label"])) for row in rows[:MAXIMUM_CHOICES]])
        self._publish(question_id, "stage", {"stage": "writing"}, cursor)
        blocks = [build_calc_block(item, *results.calcs[item.query_id]) if item.query_id in results.calcs else build_block(item, *results.queries[item.query_id]) for item in plan.blocks]
        return AssistantAnswer(kind=AnswerKind.ANSWER, message=fill_message(plan.message, results, plan.language), blocks=blocks, method=build_answer_method(plan))

    def _run_read_only(self, plan: AssistantPlan, query_scope: QueryScope, context: PeriodContext) -> PlanResults:
        """
        Run the plan's queries in one read-only transaction with a statement timeout.

        Args:
            plan (AssistantPlan): Normalized plan.
            query_scope (QueryScope): Sites and money visibility.
            context (PeriodContext): Today and Season starts.

        Returns:
            PlanResults: Rows, calcs or why it stopped.
        """
        self.db.commit()
        connection = self.db.connection()
        connection.execute(text("SET TRANSACTION READ ONLY"))
        connection.execute(text(f"SET LOCAL statement_timeout = {STATEMENT_TIMEOUT_IN_MILLISECONDS}"))
        try:
            return run_plan(plan, query_scope, context, lambda sql, params: [dict(row) for row in connection.execute(text(sql), params).mappings()])
        finally:
            self.db.rollback()

    def _load_history(self, question: AssistantQuestion) -> list[tuple[str, dict[str, Any] | None]]:
        """
        Give the model the last answered questions and their queries, never their rows.

        Args:
            question (AssistantQuestion): Question being answered.

        Returns:
            list[tuple[str, dict[str, Any] | None]]: Oldest first.
        """
        earlier = self.db.scalars(
            select(AssistantQuestion).where(AssistantQuestion.conversation_id == question.conversation_id, AssistantQuestion.created_at < question.created_at, AssistantQuestion.status == QuestionStatus.ANSWERED).order_by(AssistantQuestion.created_at.desc()).limit(HISTORY_SIZE)
        ).all()
        return [(item.text, {"queries": (item.plan or {}).get("queries", [])}) for item in reversed(earlier)]

    def _describe_scope(self, scope: QuestionScope) -> str:
        """
        Tell the model the Sites, the Home period and whether money is visible.

        Args:
            scope (QuestionScope): Scope saved at asking time.

        Returns:
            str: One line.
        """
        money = "money visible" if scope.can_see_money else "NO money: the asker lacks the finance right, never use money fields, measures or entities"
        return f"Sites {', '.join(scope.site_names)}; Home period {scope.period}; {money}"

    def _attempt_filters(self, question_id: UUID, cursor: str | None) -> tuple[Any, ...]:
        """
        Name only a still-pending, current attempt.

        Args:
            question_id (UUID): Question id.
            cursor (str | None): Replay boundary of the attempt.

        Returns:
            tuple[Any, ...]: Compare-and-set predicates.
        """
        return (AssistantQuestion.id == question_id, AssistantQuestion.status == QuestionStatus.PENDING, AssistantQuestion.stream_cursor == cursor)

    def _fail(self, question_id: UUID, cursor: str | None, code: str) -> None:
        """
        Fail only the current attempt, tolerating a deletion during the model call.

        Args:
            question_id (UUID): Question id.
            cursor (str | None): Current attempt.
            code (str): Refusal code the front translates.
        """
        self.db.rollback()
        saved = self.db.execute(update(AssistantQuestion).where(*self._attempt_filters(question_id, cursor)).values(status=QuestionStatus.FAILED, error_code=code)).rowcount
        self.db.commit()
        if saved:
            self._publish(question_id, "error", {"code": code}, cursor)

    def _publish(self, question_id: UUID, event: str, data: dict[str, Any], cursor: str | None) -> None:
        """
        Add one event to the question's stream, tagged with the attempt.

        Args:
            question_id (UUID): Question id.
            event (str): Event name.
            data (dict[str, Any]): Payload.
            cursor (str | None): Current attempt.
        """
        self.streams.publish(build_stream_key(question_id), event, {**data, "attemptCursor": cursor})

    def _publish_answer(self, question: AssistantQuestion, answer: AssistantAnswer, cursor: str | None) -> None:
        """
        Stream a saved answer: the message a few words at a time, then each block, the choices and done.

        Args:
            question (AssistantQuestion): The answered question.
            answer (AssistantAnswer): Its saved answer.
            cursor (str | None): Current attempt.
        """
        for chunk in split_message(answer.message):
            self._publish(question.id, "message.delta", {"text": chunk}, cursor)
            time.sleep(DELTA_PAUSE_IN_SECONDS)
        for block in answer.blocks:
            self._publish(question.id, "block", block.model_dump(mode="json", by_alias=True), cursor)
        if answer.choices:
            self._publish(question.id, "choices", {"choices": [item.model_dump(mode="json", by_alias=True) for item in answer.choices]}, cursor)
        self._publish(question.id, "done", {"question": map_question(question).model_dump(mode="json", by_alias=True)}, cursor)


def pin_plan(plan: AssistantPlan, entity: str, record_id: str) -> AssistantPlan:
    """
    Pin every query of a clarified plan to the chosen record.

    Args:
        plan (AssistantPlan): Saved plan.
        entity (str): Entity of the chosen record.
        record_id (str): Its id.

    Returns:
        AssistantPlan: The plan to run again.
    """
    return plan.model_copy(update={"queries": [pin_record(query, entity, record_id) for query in plan.queries]})
