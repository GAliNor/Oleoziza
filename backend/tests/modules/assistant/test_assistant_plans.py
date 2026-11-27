from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from modules.assistant.business.date_rules import PeriodContext
from modules.assistant.business.plan_rules import normalize_plan
from modules.assistant.business.plan_runner import run_plan
from modules.assistant.business.query_compiler import QueryScope
from modules.assistant.types.assistant_types import AssistantPlan
from tests.modules.assistant.assistant_test_data import build_mill


TODAY = date.today()

CONTEXT = PeriodContext(today=TODAY, season_starts_on=TODAY - timedelta(days=20), previous_season_starts_on=TODAY - timedelta(days=385))


def build_plan(**content: Any) -> AssistantPlan:
    """
    Build a plan as the model would return it, with empty defaults.

    Args:
        **content (Any): Plan fields.

    Returns:
        AssistantPlan: The validated plan.
    """
    return AssistantPlan.model_validate({"kind": "answer", "language": "fr", "message": "", "queries": [], "calcs": [], "blocks": [], "next": None, **content})


def run(db: Session, plan: AssistantPlan, site_ids: list, home_period: str = "season") -> Any:
    """
    Normalize and run a plan on the test session.

    Args:
        db (Session): Test session.
        plan (AssistantPlan): Plan to run.
        site_ids (list): Sites in scope.
        home_period (str): Home period.

    Returns:
        Any: The plan results.
    """
    normalized = normalize_plan(plan, CONTEXT, home_period)
    return run_plan(normalized, QueryScope(site_ids=site_ids, can_see_money=True), CONTEXT, lambda sql, params: [dict(row) for row in db.execute(text(sql), params).mappings()])


def test_a_dated_query_takes_the_home_period_and_current_stock_does_not() -> None:
    """
    Without a period, a Lot query counts the Home's period on reception day; a Storage query reads current state with no dates.
    """
    plan = normalize_plan(build_plan(queries=[{"id": "q1", "entity": "lot", "measures": ["count"]}, {"id": "q2", "entity": "storage", "measures": ["remaining_litres"]}]), CONTEXT, "month")

    lot_filters = {(item.field, item.op.value, item.value) for item in plan.queries[0].filters}
    assert ("received_date", "gte", TODAY.replace(day=1).isoformat()) in lot_filters
    assert ("received_date", "lt", (TODAY + timedelta(days=1)).isoformat()) in lot_filters
    assert plan.queries[1].filters == []


def test_a_named_client_flows_into_the_next_query(db: Session) -> None:
    """
    « Combien Karim Bennani nous a vendu ? »: the Client found by name feeds the Lot query through {q1.id}, and the message is filled in DH.
    """
    mill = build_mill(db)
    plan = build_plan(
        message="Achats : {q2.purchase_amount}.",
        queries=[
            {"id": "q1", "entity": "client", "fields": ["id", "name"], "filters": [{"field": "name", "op": "matches", "value": "karim"}], "expectsOneRecord": True},
            {"id": "q2", "entity": "lot", "measures": ["purchase_amount"], "filters": [{"field": "client_id", "op": "eq", "value": "{q1.id}"}]},
        ],
    )

    results = run(db, plan, [mill.site.id])

    assert results.stop_reason is None
    assert results.queries["q2"][1][0]["purchase_amount"] == Decimal("8000")


def test_an_ambiguous_name_asks_which_one(db: Session) -> None:
    """
    A name matching several Clients stops the plan with a clarify, before any figure is read.
    """
    mill = build_mill(db)
    plan = build_plan(queries=[{"id": "q1", "entity": "client", "fields": ["id", "name"], "filters": [{"field": "name", "op": "matches", "value": "e"}], "expectsOneRecord": True}])

    results = run(db, plan, [mill.site.id])

    assert results.stop_reason == "clarify"
    assert len(results.stop_query[1]) == 2


def test_calcs_are_computed_in_code(db: Session) -> None:
    """
    The Result (Revenue − operating costs) and a share in percent come from code, not from the model.
    """
    mill = build_mill(db)
    plan = build_plan(
        queries=[{"id": "q1", "entity": "lot", "measures": ["revenue", "outstanding"]}, {"id": "q2", "entity": "expense", "measures": ["operating_amount"], "filters": [{"field": "payment_state", "op": "eq", "value": "paid"}]}],
        calcs=[{"id": "c1", "op": "difference", "left": "{q1.revenue}", "right": "{q2.operating_amount}"}, {"id": "c2", "op": "ratio", "left": "{q1.outstanding}", "right": "{q1.revenue}"}],
    )

    results = run(db, plan, [mill.site.id])
    revenue, outstanding = results.queries["q1"][1][0]["revenue"], results.queries["q1"][1][0]["outstanding"]

    assert results.calcs["c1"][0] == revenue
    assert results.calcs["c2"][0] == round(outstanding / revenue * 100, 1)


def test_days_between_counts_calendar_days() -> None:
    """
    « Dans combien de jours ? » is the days from today to a date.
    """
    plan = build_plan(calcs=[{"id": "c1", "op": "days_between", "left": "today", "right": (TODAY + timedelta(days=12)).isoformat()}])

    results = run_plan(normalize_plan(plan, CONTEXT, "season"), QueryScope(site_ids=[], can_see_money=True), CONTEXT, lambda sql, params: [])

    assert results.calcs["c1"][0] == 12


def test_compare_with_the_previous_season_adds_its_columns(db: Session) -> None:
    """
    A Season figure compared with the previous Season gets its earlier value and change, over as many days.
    """
    mill = build_mill(db)
    plan = build_plan(queries=[{"id": "q1", "entity": "lot", "measures": ["count"], "period": "season", "compare": "previous_season"}])

    row = run(db, plan, [mill.site.id]).queries["q1"][1][0]

    assert row["count"] == 6
    assert row["count_previous"] == 0
    assert row["count_change_pct"] is None
