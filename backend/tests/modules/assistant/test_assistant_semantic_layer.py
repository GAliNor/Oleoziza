from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from core.exceptions import RefusedError
from modules.assistant.types.assistant_types import BusinessQuery, FilterOperator, QueryFilter
from modules.finance.business.lot_fees import list_client_debts
from tests.modules.assistant.assistant_test_data import build_mill, get_sales_figures, read_rows


MONEY_MEASURES = ["revenue", "collected", "pending", "outstanding"]


def test_lot_money_measures_match_the_finances_tab(db: Session) -> None:
    """
    Revenue, Collected, pending and Outstanding read by the Assistant equal the Finances tab's four figures on the same Lots, every fee rule included.
    """
    mill = build_mill(db)

    rows = read_rows(db, BusinessQuery(id="q1", entity="lot", measures=MONEY_MEASURES), [mill.site.id])

    assert {name: float(rows[0][name]) for name in MONEY_MEASURES} == pytest.approx(get_sales_figures(db, mill.site.id))
    assert float(rows[0]["revenue"]) == pytest.approx(float(rows[0]["collected"] + rows[0]["pending"] + rows[0]["outstanding"]))


def test_outstanding_per_client_matches_the_debt_follow_up(db: Session) -> None:
    """
    A Client's Outstanding grouped by the Assistant equals what the debt follow-up lists for that Client.
    """
    mill = build_mill(db)

    rows = read_rows(db, BusinessQuery(id="q1", entity="lot", fields=["client_id"], measures=["outstanding"], filters=[QueryFilter(field="outstanding", op=FilterOperator.GT, value="0")]), [mill.site.id])

    assert {row["client_id"]: row["outstanding"] for row in rows} == list_client_debts(db, [mill.site.id])


def test_purchases_count_what_the_mill_paid_not_revenue(db: Session) -> None:
    """
    A Client who sold olives shows them as a Purchase amount (kg × Daily Price), never as Revenue.
    """
    mill = build_mill(db)

    rows = read_rows(db, BusinessQuery(id="q1", entity="lot", measures=["purchase_amount", "revenue"], filters=[QueryFilter(field="client_id", op=FilterOperator.EQ, value=str(mill.second_client.id)), QueryFilter(field="mode", op=FilterOperator.EQ, value="purchase")]), [mill.site.id])

    assert rows[0]["purchase_amount"] == Decimal("8000")
    assert rows[0]["revenue"] == 0


def test_a_site_out_of_scope_is_never_read(db: Session) -> None:
    """
    Whatever the filters, the asker's Sites limit every query: the other Site's Lot only shows when that Site is in scope.
    """
    mill = build_mill(db)

    only_first = read_rows(db, BusinessQuery(id="q1", entity="lot", measures=["count"]), [mill.site.id])
    only_other = read_rows(db, BusinessQuery(id="q1", entity="lot", measures=["count"]), [mill.other_site.id])

    assert only_first[0]["count"] == 6
    assert only_other[0]["count"] == 1


def test_money_needs_finance_view(db: Session) -> None:
    """
    Without the finance-view Permission, money measures and money entities are refused, while weights stay readable (D4).
    """
    mill = build_mill(db)

    weights = read_rows(db, BusinessQuery(id="q1", entity="lot", measures=["net_weight_kg"]), [mill.site.id], can_see_money=False)

    assert weights[0]["net_weight_kg"] == Decimal("6000.0")
    for query in (BusinessQuery(id="q1", entity="lot", measures=["revenue"]), BusinessQuery(id="q1", entity="payment", measures=["count"]), BusinessQuery(id="q1", entity="lot", fields=["code"], filters=[QueryFilter(field="fee", op=FilterOperator.GT, value="0")])):
        with pytest.raises(RefusedError) as refusal:
            read_rows(db, query, [mill.site.id], can_see_money=False)
        assert refusal.value.code == "assistant_finance_forbidden"


def test_only_declared_names_reach_sql(db: Session) -> None:
    """
    An undeclared entity, field or enum value is refused before any SQL runs.
    """
    mill = build_mill(db)

    cases = [
        (BusinessQuery(id="q1", entity="users", measures=["count"]), "assistant_unknown_entity"),
        (BusinessQuery(id="q1", entity="client", fields=["national_id_number"]), "assistant_unknown_field"),
        (BusinessQuery(id="q1", entity="lot", fields=["code"], filters=[QueryFilter(field="status", op=FilterOperator.EQ, value="lost")]), "assistant_filter_value_invalid"),
        (BusinessQuery(id="q1", entity="lot", fields=["code"], filters=[QueryFilter(field="client_name", op=FilterOperator.EQ, value="x'; DROP TABLE lots; --")]), None),
    ]
    for query, code in cases:
        if code is None:
            assert read_rows(db, query, [mill.site.id]) == []
            continue
        with pytest.raises(RefusedError) as refusal:
            read_rows(db, query, [mill.site.id])
        assert refusal.value.code == code


def test_names_match_without_accents_or_case(db: Session) -> None:
    """
    « karim bénnani » finds Karim Bennani, as a manager types a name.
    """
    mill = build_mill(db)

    rows = read_rows(db, BusinessQuery(id="q1", entity="client", fields=["id", "name"], filters=[QueryFilter(field="name", op=FilterOperator.MATCHES, value="karim bénnani")]), [mill.site.id])

    assert [row["id"] for row in rows] == [mill.second_client.id]
