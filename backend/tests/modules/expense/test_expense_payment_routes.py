import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.helpers import get_local_today
from modules.expense.business.expense_due import list_due_expenses
from modules.expense.business.recurrences import add_months, create_due_occurrences
from modules.expense.models.expense_models import Expense, ExpenseCategory, RecurringExpense
from modules.expense.types.expense_types import ExpenseCategoryType, ExpensePaymentState, ExpenseVatNature
from modules.site.models.site_models import Season, Site
from modules.site.types.site_types import SeasonStatus
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_site, create_staff_user, open_fresh_season


API_URL = "/api/expense/expenses"

SUBCATEGORY_ID = "electricity"


@pytest.fixture
def site(db: Session) -> Site:
    """
    A Site in an open Season, with the sub-category the tests file under.

    Args:
        db (Session): Test session.

    Returns:
        Site: The Site.
    """
    open_fresh_season(db)
    if db.get(ExpenseCategory, SUBCATEGORY_ID) is None:
        db.add(ExpenseCategory(id="energy", type=ExpenseCategoryType.CATEGORY, position=1, vat_nature=ExpenseVatNature.NONE))
        db.flush()
        db.add(ExpenseCategory(id=SUBCATEGORY_ID, type=ExpenseCategoryType.SUBCATEGORY, parent_id="energy", position=1, vat_nature=ExpenseVatNature.GOOD))
        db.flush()
    return create_site(db)


@pytest.fixture
def headers(db: Session) -> dict[str, str]:
    """
    Sign in as an Owner.

    Args:
        db (Session): Test session.

    Returns:
        dict[str, str]: Bearer header.
    """
    return build_auth_header(create_staff_user(db, "+212669992201", is_owner=True))


def enter(client: TestClient, headers: dict[str, str], site: Site, **fields: object) -> dict:
    """
    Enter an Expense to pay, with only what a test is about.

    Args:
        client (TestClient): Test client.
        headers (dict[str, str]): Who enters it.
        site (Site): Site.
        **fields (object): Fields overriding the bare minimum.

    Returns:
        dict: The answer.
    """
    payload = {"id": str(uuid.uuid4()), "siteId": str(site.id), "categoryId": SUBCATEGORY_ID, "paymentState": "to_pay", "dueOn": get_local_today().isoformat(), **fields}
    return client.post(API_URL, json=payload, headers=headers).json()


def pay(client: TestClient, headers: dict[str, str], expense_id: str, amount: float = 100, day: date | None = None, event_id: str | None = None) -> dict:
    """
    Mark an Expense paid in cash.

    Args:
        client (TestClient): Test client.
        headers (dict[str, str]): Who pays.
        expense_id (str): Expense.
        amount (float): Amount.
        day (date | None): Payment date, today by default.
        event_id (str | None): Action id, a new one by default.

    Returns:
        dict: The answer.
    """
    return client.post(f"{API_URL}/{expense_id}/pay", json={"id": event_id or str(uuid.uuid4()), "date": (day or get_local_today()).isoformat(), "amount": amount, "paidBy": "cash"}, headers=headers).json()


def list_to_pay(client: TestClient, headers: dict[str, str], site: Site) -> list[dict]:
    """
    Read what is still to pay on a Site.

    Args:
        client (TestClient): Test client.
        headers (dict[str, str]): Who reads.
        site (Site): Site.

    Returns:
        list[dict]: The Expenses, most urgent first.
    """
    return client.get(API_URL, params={"siteId": str(site.id), "paymentState": "to_pay"}, headers=headers).json()["items"]


def summary(client: TestClient, headers: dict[str, str], site: Site) -> dict:
    """
    Read the Season's totals of a Site.

    Args:
        client (TestClient): Test client.
        headers (dict[str, str]): Who reads.
        site (Site): Site.

    Returns:
        dict: The summary.
    """
    return client.get(f"{API_URL}/summary", params={"siteId": str(site.id), "period": "season"}, headers=headers).json()


def test_an_expense_to_pay_needs_only_a_category_and_a_due_date(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q13, Q16: no amount, Supplier or description; it has no code or Season until it is paid.
    """
    body = enter(client, headers, site)

    assert (body["paymentState"], body["amount"], body["supplier"], body["description"], body["code"], body["seasonId"]) == ("to_pay", None, "", "", None, None)


def test_an_expense_to_pay_without_due_date_is_refused(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q13: the due date is what an Expense to pay is followed by.
    """
    assert enter(client, headers, site, dueOn=None) == {"code": "due_date_required"}


def test_an_expense_entered_paid_needs_date_amount_and_way_of_paying(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q13: the amount becomes required once paid.
    """
    paid = {"paymentState": "paid", "dueOn": None, "date": get_local_today().isoformat(), "paidBy": "cash"}

    assert enter(client, headers, site, **paid) == {"code": "payment_incomplete"}
    assert enter(client, headers, site, **paid, amount=120)["code"].startswith("TS-C9898-")


def test_only_paid_expenses_count_in_the_totals_and_the_export(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q14: what is to pay shows apart, and joins the totals and the accountant's export on its payment date.
    """
    expense = enter(client, headers, site, amount=300, dueOn=(get_local_today() - timedelta(days=1)).isoformat())
    enter(client, headers, site)
    today = get_local_today().isoformat()
    export = {"siteId": str(site.id), "from": today, "to": today}

    before = summary(client, headers, site)
    exported_before = client.get(f"{API_URL}/export", params=export, headers=headers).json()
    pay(client, headers, expense["id"], amount=310)
    after = summary(client, headers, site)
    exported_after = client.get(f"{API_URL}/export", params=export, headers=headers).json()

    assert (before["total"], before["toPay"]) == (0, {"count": 2, "amount": 300, "lateCount": 1, "unknownAmountCount": 1})
    assert (after["total"], after["toPay"]) == (310, {"count": 1, "amount": 0, "lateCount": 0, "unknownAmountCount": 1})
    assert (exported_before, [row["amount"] for row in exported_after]) == ([], [310])


def test_paying_gives_a_code_and_a_season_once(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    The « N° pièce » comes with the payment; a replayed payment changes nothing, a second one is refused.
    """
    expense = enter(client, headers, site)
    event_id = str(uuid.uuid4())

    first = pay(client, headers, expense["id"], event_id=event_id)
    replay = pay(client, headers, expense["id"], amount=999, event_id=event_id)
    second = pay(client, headers, expense["id"])

    assert first["code"] == "TS-C9898-0001" and first["seasonLabel"] == "Saison test"
    assert replay["amount"] == 100
    assert second == {"code": "expense_already_paid"}


def test_what_is_to_pay_lists_the_most_urgent_first(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    The list is by due date, whatever the period.
    """
    today = get_local_today()
    for days in (40, -3, 5):
        enter(client, headers, site, dueOn=(today + timedelta(days=days)).isoformat())

    assert [item["dueOn"] for item in list_to_pay(client, headers, site)] == [(today + timedelta(days=days)).isoformat() for days in (-3, 5, 40)]


def test_a_payment_made_by_mistake_goes_back_to_pay_and_keeps_its_code(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Marked paid by mistake: it leaves the totals and is to pay again.
    """
    expense = enter(client, headers, site)
    code = pay(client, headers, expense["id"])["code"]

    body = client.post(f"{API_URL}/{expense['id']}/unpay", json={"id": str(uuid.uuid4())}, headers=headers).json()

    assert (body["paymentState"], body["date"], body["code"]) == ("to_pay", None, code)
    assert summary(client, headers, site)["total"] == 0


def test_an_unpaid_expense_is_deleted_and_a_paid_one_cancelled(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q30: no money moved, so it really goes; once paid it stays, cancelled with a reason.
    """
    unpaid, paid = enter(client, headers, site), enter(client, headers, site)
    pay(client, headers, paid["id"])

    cancel_unpaid = client.post(f"{API_URL}/{unpaid['id']}/cancel", json={"reason": "Erreur"}, headers=headers).json()
    deleted = client.delete(f"{API_URL}/{unpaid['id']}", headers=headers)
    delete_paid = client.delete(f"{API_URL}/{paid['id']}", headers=headers).json()
    cancelled = client.post(f"{API_URL}/{paid['id']}/cancel", json={"reason": "Erreur"}, headers=headers).json()

    assert (cancel_unpaid, delete_paid) == ({"code": "expense_not_paid"}, {"code": "expense_already_paid"})
    assert deleted.status_code == 204 and db.get(Expense, uuid.UUID(unpaid["id"])) is None
    assert cancelled["status"] == "cancelled"


def test_paying_a_recurring_expense_creates_the_next_one(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q15: the next occurrence copies this one, a month later, even after a late payment.
    """
    due_on = date(2026, 10, 31)
    expense = enter(client, headers, site, dueOn=due_on.isoformat(), frequency="monthly", supplier="ONEE", amount=800)

    pay(client, headers, expense["id"], amount=950)
    upcoming = list_to_pay(client, headers, site)

    assert [(item["dueOn"], item["supplier"], item["amount"], item["frequency"]) for item in upcoming] == [("2026-11-30", "ONEE", 950, "monthly")]


@pytest.mark.parametrize(("start", "months", "expected"), [(date(2027, 1, 31), 1, date(2027, 2, 28)), (date(2027, 2, 28), 1, date(2027, 3, 31)), (date(2026, 12, 31), 3, date(2027, 3, 31)), (date(2028, 2, 29), 12, date(2029, 2, 28))])
def test_the_31st_falls_on_the_last_day_of_a_shorter_month_then_comes_back(start: date, months: int, expected: date) -> None:
    """
    A charge due on the 31st stays at the end of every month.
    """
    assert add_months(start, months, 31) == expected


def test_the_next_one_appears_on_its_date_when_the_last_is_unpaid_and_only_once(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q15: two late ones can wait together; running the hourly task twice adds nothing twice.
    """
    enter(client, headers, site, dueOn="2026-09-15", frequency="monthly")

    added = [create_due_occurrences(db, day) for day in (date(2026, 10, 14), date(2026, 11, 20), date(2026, 11, 20))]

    assert added == [0, 2, 0]
    assert [item["dueOn"] for item in list_to_pay(client, headers, site)] == ["2026-09-15", "2026-10-15", "2026-11-15"]


def test_paying_an_older_late_one_adds_nothing(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Only the last occurrence brings the next one.
    """
    first = enter(client, headers, site, dueOn="2026-10-15", frequency="monthly")
    create_due_occurrences(db, date(2026, 11, 20))

    pay(client, headers, first["id"])

    assert [item["dueOn"] for item in list_to_pay(client, headers, site)] == ["2026-11-15"]


def test_deleting_the_next_one_skips_it(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    A month with nothing to pay is skipped: the recurrence goes on from the date after.
    """
    expense = enter(client, headers, site, dueOn="2026-12-10", frequency="yearly")

    client.delete(f"{API_URL}/{expense['id']}", headers=headers)

    assert [item["dueOn"] for item in list_to_pay(client, headers, site)] == ["2027-12-10"]


def test_stopping_a_recurrence_removes_the_next_one_and_keeps_late_and_paid_ones(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q30: what was paid or is owed stays; nothing new comes.
    """
    first = enter(client, headers, site, dueOn="2026-09-15", frequency="monthly")
    create_due_occurrences(db, get_local_today())
    latest = list_to_pay(client, headers, site)[-1]
    pay(client, headers, latest["id"])
    owed = [item["dueOn"] for item in list_to_pay(client, headers, site) if item["dueOn"] <= get_local_today().isoformat()]

    client.post(f"{API_URL}/{first['id']}/stop-recurrence", json={"id": str(uuid.uuid4())}, headers=headers)
    create_due_occurrences(db, get_local_today() + timedelta(days=400))

    assert [item["dueOn"] for item in list_to_pay(client, headers, site)] == owed
    assert all(item["frequency"] is None for item in list_to_pay(client, headers, site))


@pytest.mark.parametrize(("frequency", "days_ahead", "is_alerted"), [("yearly", 30, True), ("yearly", 31, False), ("quarterly", 30, True), ("monthly", 7, True), ("monthly", 8, False), (None, 7, True), (None, 8, False), (None, -5, True)])
def test_alerts_start_30_days_ahead_for_long_recurrences_and_7_otherwise(client: TestClient, db: Session, site: Site, headers: dict[str, str], frequency: str | None, days_ahead: int, is_alerted: bool) -> None:
    """
    Q15: a yearly or quarterly charge is announced a month ahead, the others a week; late ones always.
    """
    enter(client, headers, site, dueOn=(get_local_today() + timedelta(days=days_ahead)).isoformat(), frequency=frequency)

    assert bool(list_due_expenses(db, [site.id], get_local_today())) is is_alerted


def test_a_payment_after_the_season_ended_counts_in_it_until_the_next_one_starts(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q29: off-season Expenses need no open Season; they belong to the last one that started.
    """
    season = db.query(Season).filter_by(code="9898").one()
    season.starts_on, season.ends_on = get_local_today() - timedelta(days=200), get_local_today() - timedelta(days=110)
    for other in db.query(Season).filter(Season.id != season.id, Season.starts_on > season.starts_on):
        db.delete(other) if other.status == SeasonStatus.PLANNED else setattr(other, "starts_on", date(2020, 1, 1))
    db.flush()

    body = pay(client, headers, enter(client, headers, site)["id"])

    assert body["seasonId"] == str(season.id)
    assert summary(client, headers, site)["count"] == 1


def test_a_closed_season_locks_what_was_paid_before_it_closed_only(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q29: closing settles the past; the same Season still takes what is paid afterwards.
    """
    season = db.query(Season).filter_by(code="9898").one()
    yesterday = get_local_today() - timedelta(days=1)
    settled = pay(client, headers, enter(client, headers, site)["id"], day=yesterday)
    season.status = SeasonStatus.CLOSED
    season.closed_at = datetime.now(timezone.utc)
    db.flush()

    late_entry = pay(client, headers, enter(client, headers, site)["id"], day=yesterday)
    correction = client.put(f"{API_URL}/{settled['id']}", json={"id": settled["id"], "siteId": str(site.id), "categoryId": SUBCATEGORY_ID, "date": yesterday.isoformat(), "amount": 5, "paidBy": "cash"}, headers=headers).json()
    today_entry = pay(client, headers, enter(client, headers, site)["id"])

    assert (late_entry, correction) == ({"code": "season_closed"}, {"code": "season_closed"})
    assert today_entry["seasonId"] == str(season.id)
    assert client.get(f"{API_URL}/{settled['id']}", headers=headers).json()["isLocked"] is True


def test_changing_an_expense_to_pay_keeps_it_to_pay(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Editing is not paying: the state changes only through « Marquer payée ».
    """
    expense = enter(client, headers, site)

    body = client.put(f"{API_URL}/{expense['id']}", json={**{key: expense[key] for key in ("id", "siteId", "categoryId", "dueOn")}, "paymentState": "paid", "amount": 40, "supplier": "ONEE"}, headers=headers).json()

    assert (body["paymentState"], body["amount"], body["supplier"]) == ("to_pay", 40, "ONEE")


def test_a_replayed_entry_is_not_a_second_recurrence(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    A retry after a lost answer gives back the Expense already saved.
    """
    expense_id = str(uuid.uuid4())
    for _ in range(2):
        enter(client, headers, site, id=expense_id, frequency="monthly")

    assert db.query(RecurringExpense).filter_by(site_id=site.id).count() == 1
    assert db.query(Expense).filter_by(site_id=site.id, payment_state=ExpensePaymentState.TO_PAY).count() == 1


def test_a_charge_due_soon_is_a_task_for_who_keeps_the_register(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q15: it shows in À faire, only for those who may pay it.
    """
    enter(client, headers, site, dueOn=(get_local_today() - timedelta(days=2)).isoformat(), amount=80)
    reader = create_staff_user(db, "+212669992202", permissions_by_site={site.id: [Permission.CLIENT_VIEW]})

    tasks = client.get("/api/task/tasks", params={"siteId": str(site.id)}, headers=headers).json()
    for_reader = client.get("/api/task/tasks", params={"siteId": str(site.id)}, headers=build_auth_header(reader, {site.id: [Permission.CLIENT_VIEW]})).json()

    assert [(task["kind"], task["params"]["daysLeft"], task["amount"]) for task in tasks] == [("expense-due", -2, 80)]
    assert for_reader == []


def test_the_journal_tells_a_charge_planned_paid_and_one_deleted_since(client: TestClient, db: Session, site: Site, headers: dict[str, str]) -> None:
    """
    Q30: a deleted Charge leaves its line in the Journal.
    """
    kept, gone = enter(client, headers, site, supplier="ONEE"), enter(client, headers, site, supplier="Garage Atlas", amount=60)
    pay(client, headers, kept["id"])
    client.delete(f"{API_URL}/{gone['id']}", headers=headers)

    events = client.get("/api/audit/journal", params={"siteId": str(site.id), "day": get_local_today().isoformat()}, headers=headers).json()["items"]

    assert [(event["kind"], event["subject"]) for event in events] == [("expense_deleted", "Garage Atlas"), ("expense_paid", "ONEE"), ("expense_planned", "Garage Atlas"), ("expense_planned", "ONEE")]
    assert events[0]["amount"] == 60
