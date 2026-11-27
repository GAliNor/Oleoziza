from datetime import datetime
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import Field, model_validator

from core.types import CamelModel


ASSISTANT_RECORD_TYPE = "assistant_question"

TRANSCRIPTION_RECORD_TYPE = "assistant_dictation"

ANSWER_TASK_NAME = "assistant.answer_question"

MAXIMUM_ROWS = 50

HISTORY_SIZE = 3

DIGEST_ROWS = 10

DIGEST_COLUMNS = 8

DIGEST_TEXT_LENGTH = 60

MAXIMUM_RECORDING_BYTES = 2_000_000

QUERY_IDS = ("q1", "q2", "q3", "q4")

CALC_IDS = ("c1", "c2")

PLAN_LANGUAGES = ("fr", "ar", "darija_latin", "darija_arabic")

MAXIMUM_SUGGESTIONS = 3

MAXIMUM_SUGGESTION_LENGTH = 120

HOME_PERIODS = ("today", "week", "month", "season", "previous")

PLAN_PERIODS = (
    "today", "yesterday", "this_week", "last_week", "last_7_days", "this_month", "last_month",
    "this_year", "last_year", "season", "previous_season", "all_time",
)

QueryId = Literal["q1", "q2", "q3", "q4"]

CalcId = Literal["c1", "c2"]

PlanLanguage = Literal["fr", "ar", "darija_latin", "darija_arabic"]

HomePeriod = Literal["today", "week", "month", "season", "previous"]

PlanPeriod = Literal[
    "today", "yesterday", "this_week", "last_week", "last_7_days", "this_month", "last_month",
    "this_year", "last_year", "season", "previous_season", "all_time",
]


class QuestionStatus(StrEnum):
    PENDING = "pending"
    ANSWERED = "answered"
    FAILED = "failed"


class AnswerKind(StrEnum):
    ANSWER = "answer"
    OFF_TOPIC = "off_topic"
    CLARIFY = "clarify"


class FilterOperator(StrEnum):
    EQ = "eq"
    NEQ = "neq"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    IN = "in"
    MATCHES = "matches"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"


class BlockType(StrEnum):
    NUMBER = "number"
    TABLE = "table"
    BAR_CHART = "bar_chart"
    CARDS = "cards"


class CalcOperator(StrEnum):
    DIFFERENCE = "difference"
    RATIO = "ratio"
    DAYS_BETWEEN = "days_between"


class QueryFilter(CamelModel):
    field: str
    op: FilterOperator
    value: str


class QueryOrder(CamelModel):
    field: str
    direction: Literal["asc", "desc"]


class BusinessQuery(CamelModel):
    id: QueryId
    entity: str
    fields: list[str] = Field(default_factory=list, max_length=12)
    measures: list[str] = Field(default_factory=list, max_length=8)
    filters: list[QueryFilter] = Field(default_factory=list, max_length=12)
    order_by: QueryOrder | None = None
    limit: int = Field(default=20, ge=1, le=MAXIMUM_ROWS)
    expects_one_record: bool = False
    period: PlanPeriod | None = None
    date_field: str | None = None
    compare: Literal["previous_period", "previous_season"] | None = None


class PlanCalc(CamelModel):
    id: CalcId
    op: CalcOperator
    left: str
    right: str


class PlannedBlock(CamelModel):
    type: BlockType
    query_id: str
    title: str
    label_field: str | None = None
    value_field: str | None = None


class NextRound(CamelModel):
    sees: list[QueryId] = Field(min_length=1, max_length=4)
    why: str


class AssistantPlan(CamelModel):
    kind: AnswerKind
    language: PlanLanguage
    message: str
    queries: list[BusinessQuery] = Field(default_factory=list, max_length=4)
    calcs: list[PlanCalc] = Field(default_factory=list, max_length=2)
    blocks: list[PlannedBlock] = Field(default_factory=list, max_length=6)
    next: NextRound | None = None
    suggestions: list[str] = Field(default_factory=list, max_length=MAXIMUM_SUGGESTIONS)

    @model_validator(mode="after")
    def validate_bindings(self) -> "AssistantPlan":
        """
        Reject duplicate ids, dangling blocks or rounds, and off-topic plans that read data.

        Returns:
            AssistantPlan: This validated plan.

        Raises:
            ValueError: A binding or off-topic contract is invalid.
        """
        query_ids = [query.id for query in self.queries]
        calc_ids = [calc.id for calc in self.calcs]
        if len(set(query_ids)) != len(query_ids) or len(set(calc_ids)) != len(calc_ids):
            raise ValueError("Query and calc ids must be unique")
        sources = {*query_ids, *calc_ids}
        if any(block.query_id not in sources for block in self.blocks):
            raise ValueError("Every block must reference a declared query or calc")
        if self.next and any(query_id not in query_ids for query_id in self.next.sees):
            raise ValueError("next.sees must name declared queries")
        if self.kind == AnswerKind.OFF_TOPIC and (self.queries or self.blocks or self.calcs):
            raise ValueError("Off-topic plans must not query data")
        return self


class QuestionScope(CamelModel):
    site_ids: list[UUID]
    site_names: list[str]
    period: HomePeriod
    can_see_money: bool


class QuestionIn(CamelModel):
    text: str = Field(min_length=1, max_length=1000)
    conversation_id: UUID | None = None
    request_id: UUID | None = None
    site_id: UUID | None = None
    period: HomePeriod = "season"


class ChoiceIn(CamelModel):
    entity: str
    record_id: UUID


class FeedbackIn(CamelModel):
    rating: int = Field(ge=-1, le=1)


class AnswerColumn(CamelModel):
    key: str
    kind: str


class AnswerFact(CamelModel):
    key: str
    value: str | int | float | None
    kind: str


class AnswerRecord(CamelModel):
    id: str
    entity: str
    label: str
    link: str | None = None
    facts: list[AnswerFact] = Field(default_factory=list)


class AnswerReporting(CamelModel):
    date_field: str
    from_date: str | None = Field(default=None, alias="from")
    to_date: str | None = Field(default=None, alias="to")


class AnswerBlock(CamelModel):
    type: str
    title: str
    columns: list[AnswerColumn] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    label_field: str | None = None
    value_field: str | None = None
    entity: str | None = None
    records: list[AnswerRecord] = Field(default_factory=list)
    reporting: AnswerReporting | None = None
    is_truncated: bool = False


class AnswerChoice(CamelModel):
    entity: str
    record_id: str
    label: str


class AnswerMethodFilter(CamelModel):
    field: str
    op: FilterOperator
    value: str


class AnswerMethodQuery(CamelModel):
    entity: str
    measures: list[str]
    group_by: list[str]
    filters: list[AnswerMethodFilter]
    period: str | None
    compare: str | None


class AnswerMethodCalc(CamelModel):
    op: CalcOperator
    left: str
    right: str


class AnswerMethod(CamelModel):
    queries: list[AnswerMethodQuery]
    calcs: list[AnswerMethodCalc]


class AnswerScope(CamelModel):
    site_names: list[str]
    period: str


class AssistantAnswer(CamelModel):
    kind: AnswerKind
    message: str
    blocks: list[AnswerBlock] = Field(default_factory=list)
    choices: list[AnswerChoice] = Field(default_factory=list)
    scope: AnswerScope | None = None
    computed_at: datetime | None = None
    suggestions: list[str] = Field(default_factory=list)
    method: AnswerMethod | None = None


class QuestionOut(CamelModel):
    id: UUID
    conversation_id: UUID
    text: str
    status: QuestionStatus
    answer: AssistantAnswer | None
    error_code: str | None
    rating: int | None
    created_at: datetime
    stream_cursor: str | None = None


class ConversationListItemOut(CamelModel):
    id: UUID
    title: str
    updated_at: datetime


class ConversationOut(CamelModel):
    id: UUID
    title: str
    questions: list[QuestionOut]


class ConversationPageOut(CamelModel):
    items: list[ConversationListItemOut]
    total: int


class TranscriptionOut(CamelModel):
    text: str
