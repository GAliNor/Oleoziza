from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from modules.ai.models.ai_models import AiCall, AiProvider
from modules.ai.types.ai_types import AiApiStyle, AiCallStatus, AiFeature, AiProviderKind, StructuredCallResult
from modules.assistant.models.assistant_models import AssistantConversation, AssistantQuestion
from modules.assistant.services.assistant_answer_services import AssistantAnswerService
from modules.assistant.types.assistant_types import QuestionStatus
from modules.user.types.user_types import Role
from tests.factories import create_staff_user
from tests.modules.assistant.assistant_test_data import build_mill


class FakeStreams:
    def __init__(self) -> None:
        """
        Record published events instead of writing to Redis.
        """
        self.events: list[tuple[str, dict[str, Any]]] = []

    def publish(self, stream: str, event: str, data: dict[str, Any]) -> str:
        """
        Keep one event.

        Args:
            stream (str): Stream key.
            event (str): Event name.
            data (dict[str, Any]): Payload.

        Returns:
            str: A fake event id.
        """
        self.events.append((event, data))
        return str(len(self.events))


class FakeModel:
    def __init__(self, db: Session, plans: list[dict[str, Any]]) -> None:
        """
        Answer each model call with the next prepared plan, on a ledger row as the AI gateway records one.

        Args:
            db (Session): Test session.
            plans (list[dict[str, Any]]): Plans, in call order.
        """
        self.db = db
        self.plans = plans
        self.prompts: list[str] = []
        self.provider = AiProvider(kind=AiProviderKind.OTHER, label=f"Fake {uuid4().hex[:8]}", base_url="https://fake.test", api_style=AiApiStyle.OPENAI_CHAT)
        db.add(self.provider)
        db.flush()

    def run_structured(self, context: Any, prompt: Any) -> StructuredCallResult:
        """
        Return the next plan as the model's JSON.

        Args:
            context (Any): Call context, unused.
            prompt (Any): The prompt, kept for assertions.

        Returns:
            StructuredCallResult: The plan.
        """
        self.prompts.append(prompt.user_prompt)
        call = AiCall(feature=AiFeature.ASSISTANT, provider_id=self.provider.id, model_name="fake", status=AiCallStatus.SUCCEEDED, input_price_per_million=Decimal("0"), output_price_per_million=Decimal("0"), reserved_cost_usd=Decimal("0"))
        self.db.add(call)
        self.db.commit()
        return StructuredCallResult(call_id=call.id, content=self.plans.pop(0), cost_usd=Decimal("0"), model_name="fake")


def ask(db: Session, site_ids: list[UUID], plans: list[dict[str, Any]], can_see_money: bool = True) -> tuple[AssistantQuestion, FakeStreams, FakeModel]:
    """
    Store a pending question and answer it with a fake model and stream.

    Args:
        db (Session): Test session.
        site_ids (list[UUID]): Sites in the question's scope.
        plans (list[dict[str, Any]]): Plans the fake model returns.
        can_see_money (bool): Whether money is visible.

    Returns:
        tuple[AssistantQuestion, FakeStreams, FakeModel]: The answered question, its events and the model.
    """
    user = create_staff_user(db, f"+2126{uuid4().int % 10**8:08d}", Role.MANAGEMENT, is_owner=True)
    conversation = AssistantConversation(user_id=user.id, title="Test")
    question = AssistantQuestion(conversation=conversation, text="CA de la saison ?", status=QuestionStatus.PENDING, scope={"siteIds": [str(site_id) for site_id in site_ids], "siteNames": ["AA"], "period": "season", "canSeeMoney": can_see_money}, stream_cursor="1-0")
    db.add_all([conversation, question])
    db.commit()
    streams, model = FakeStreams(), FakeModel(db, plans)
    AssistantAnswerService(db, streams, model).answer(question.id, None, "1-0")
    db.refresh(question)
    return question, streams, model


def build_plan(**content: Any) -> dict[str, Any]:
    """
    A model plan with empty defaults, in the model's snake_case JSON.

    Args:
        **content (Any): Plan fields.

    Returns:
        dict[str, Any]: The plan JSON.
    """
    return {"kind": "answer", "language": "fr", "message": "", "queries": [], "calcs": [], "blocks": [], "next": None, **content}


def build_query(**content: Any) -> dict[str, Any]:
    """
    A model query with every key the strict schema requires.

    Args:
        **content (Any): Query fields.

    Returns:
        dict[str, Any]: The query JSON.
    """
    return {"fields": [], "measures": [], "filters": [], "order_by": None, "limit": 20, "expects_one_record": False, "period": None, "date_field": None, "compare": None, **content}


def test_an_answer_streams_stages_plan_words_blocks_then_done(db: Session) -> None:
    """
    The worker publishes patience stages, the planned blocks (for skeletons), the message a few words at a time, each block, then done; the saved answer carries its scope.
    """
    mill = build_mill(db)
    plan = build_plan(message="Le CA de la saison est de {q1.revenue} sur {q1.count} lots.", queries=[build_query(id="q1", entity="lot", measures=["revenue", "count"])], blocks=[{"type": "number", "query_id": "q1", "title": "CA", "label_field": None, "value_field": "revenue"}])

    question, streams, _ = ask(db, [mill.site.id], [plan])
    events = [name for name, _ in streams.events]

    assert question.status == QuestionStatus.ANSWERED
    assert events[:4] == ["stage", "plan", "stage", "stage"]
    assert events.count("message.delta") >= 3
    assert events[-2:] == ["block", "done"]
    assert "".join(data["text"] for name, data in streams.events if name == "message.delta") == question.answer["message"]
    assert question.answer["message"].startswith("Le CA de la saison est de 2 450 DH sur 6 lots")
    assert question.answer["scope"] == {"siteNames": ["AA"], "period": "season"}


def test_a_second_round_sees_only_a_digest(db: Session) -> None:
    """
    A plan that asks to see q1 first gets one more model call with a short digest of q1, never a whole table.
    """
    mill = build_mill(db)
    first = build_plan(queries=[build_query(id="q1", entity="lot", fields=["client_name"], measures=["outstanding"], order_by={"field": "outstanding", "direction": "desc"}, limit=3)], next={"sees": ["q1"], "why": "find the top debtor"})
    final = build_plan(message="{q1.rows} client.", queries=[build_query(id="q1", entity="client", fields=["name"], filters=[{"field": "name", "op": "matches", "value": "Test"}])])

    question, streams, model = ask(db, [mill.site.id], [first, final])

    assert question.status == QuestionStatus.ANSWERED
    assert len(model.prompts) == 2
    assert "Round one results (find the top debtor)" in model.prompts[1]
    assert "q1 (" in model.prompts[1] and "client_name | outstanding" in model.prompts[1]
    assert ("stage", {"stage": "deepening", "attemptCursor": "1-0"}) in streams.events


def test_money_without_finance_view_answers_politely(db: Session) -> None:
    """
    A money plan for a User without finance-view gives a fixed notice, never figures.
    """
    mill = build_mill(db)

    question, _, _ = ask(db, [mill.site.id], [build_plan(message="{q1.revenue}", queries=[build_query(id="q1", entity="lot", measures=["revenue"])])], can_see_money=False)

    assert question.status == QuestionStatus.ANSWERED
    assert "chiffres d'argent" in question.answer["message"]
    assert question.answer["blocks"] == []


def test_an_invalid_plan_is_retried_once_then_fails(db: Session) -> None:
    """
    A plan naming an unknown measure gets one retry with the reason; two bad plans fail the question with assistant_plan_invalid.
    """
    mill = build_mill(db)
    bad = build_plan(message="{q1.profit}", queries=[build_query(id="q1", entity="lot", measures=["profit"])])

    question, streams, model = ask(db, [mill.site.id], [bad, bad])

    assert question.status == QuestionStatus.FAILED
    assert question.error_code == "assistant_plan_invalid"
    assert "Invalid plan" in model.prompts[1]
    assert streams.events[-1][0] == "error"


def test_an_answer_says_how_it_was_calculated_and_offers_distinct_follow_ups(db: Session) -> None:
    """
    The saved answer lists what was read (entity, measures, grouping, filters with the period as exact dates) so the screen can explain the figure, and keeps only distinct follow-ups that differ from the question.
    """
    mill = build_mill(db)
    query = build_query(id="q1", entity="lot", fields=["client_name"], measures=["revenue"], filters=[{"field": "mode", "op": "eq", "value": "service_milling"}], period="season")
    plan = build_plan(message="Voici le CA par client.", queries=[query], suggestions=["CA de la saison ?", "  Et la saison   dernière ?  ", "et la saison dernière ?"])

    question, _, _ = ask(db, [mill.site.id], [plan])

    method = question.answer["method"]
    assert [(item["entity"], item["measures"], item["groupBy"]) for item in method["queries"]] == [("lot", ["revenue"], ["client_name"])]
    assert method["queries"][0]["filters"][0] == {"field": "mode", "op": "eq", "value": "service_milling"}
    assert {(item["field"], item["op"]) for item in method["queries"][0]["filters"][1:]} == {("received_date", "gte"), ("received_date", "lt")}
    assert method["calcs"] == []
    assert question.answer["suggestions"] == ["Et la saison dernière ?"]


def test_a_question_the_assistant_cannot_answer_still_offers_what_it_can(db: Session) -> None:
    """
    An unanswerable business question reads nothing, has no method, and keeps the closest answerable questions as suggestions.
    """
    mill = build_mill(db)
    plan = build_plan(kind="clarify", message="Je ne vois pas encore les comptes de l’application.", suggestions=["Combien de clients actifs cette saison ?"])

    question, _, _ = ask(db, [mill.site.id], [plan])

    assert question.answer["method"] is None
    assert question.answer["suggestions"] == ["Combien de clients actifs cette saison ?"]
