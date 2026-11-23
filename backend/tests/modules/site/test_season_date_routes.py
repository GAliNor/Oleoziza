from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.helpers import get_local_midnight, get_local_today
from core.integrations.rustfs.rustfs_client import get_rustfs_client
from main import app
from modules.audit.models.audit_models import AuditEvent
from modules.configuration.models.configuration_models import SiteSetting
from modules.configuration.types.configuration_types import SettingKey
from modules.expense.models.expense_models import Expense, ExpenseCategory
from modules.expense.types.expense_types import ExpenseCategoryType, ExpensePaidBy, ExpensePaymentState, ExpenseVatNature
from modules.site.models.site_models import Season, Site
from modules.site.services.season_services import get_harvest_year
from modules.site.types.site_types import SeasonStatus
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_site, create_staff_user, open_fresh_season


API_URL = "/api/site/seasons"


@pytest.fixture(autouse=True)
def storage() -> None:
    """
    Seasons here have no banner: no storage is needed.
    """
    app.dependency_overrides[get_rustfs_client] = lambda: None
    yield
    app.dependency_overrides.pop(get_rustfs_client, None)


@pytest.fixture
def headers(db: Session) -> dict[str, str]:
    """
    Sign in as an Owner.

    Args:
        db (Session): Test session.

    Returns:
        dict[str, str]: Bearer header.
    """
    return build_auth_header(create_staff_user(db, "+212669990500", is_owner=True))


@pytest.fixture
def seasons(db: Session) -> tuple[Season, Season, Season]:
    """
    A closed Season, the open one spanning today, and a prepared one, alone in the register.

    Args:
        db (Session): Test session.

    Returns:
        tuple[Season, Season, Season]: Closed, open and prepared.
    """
    current = open_fresh_season(db)
    today = get_local_today()
    for other in db.scalars(select(Season).where(Season.id != current.id)):
        other.starts_on, other.ends_on = date(2020, 1, 1), date(2020, 2, 1)
    past = Season(code="9696", label="Saison passée", starts_on=today - timedelta(days=400), ends_on=today - timedelta(days=300), status=SeasonStatus.CLOSED)
    planned = Season(code="9797", label="Saison préparée", starts_on=today + timedelta(days=300), ends_on=today + timedelta(days=390), status=SeasonStatus.PLANNED)
    db.add_all([past, planned])
    db.commit()
    return past, current, planned


def move(client: TestClient, headers: dict[str, str], season: Season, starts_on: date, ends_on: date) -> dict:
    """
    Move a Season's dates.

    Args:
        client (TestClient): Test client.
        headers (dict[str, str]): Who moves it.
        season (Season): Season moved.
        starts_on (date): First day.
        ends_on (date): Last day.

    Returns:
        dict: The answer.
    """
    return client.put(f"{API_URL}/{season.id}/dates", json={"startsOn": starts_on.isoformat(), "endsOn": ends_on.isoformat()}, headers=headers).json()


def test_the_season_takes_its_new_dates_and_says_so(client: TestClient, db: Session, headers: dict[str, str], seasons: tuple[Season, Season, Season]) -> None:
    """
    An open Season's first and last day move; its code and name stay, and the change is audited.
    """
    current = seasons[1]
    starts_on, ends_on = get_local_today() - timedelta(days=30), get_local_today() + timedelta(days=100)

    body = move(client, headers, current, starts_on, ends_on)

    assert (body["startsOn"], body["endsOn"], body["code"]) == (starts_on.isoformat(), ends_on.isoformat(), "9898")
    event = db.scalar(select(AuditEvent).where(AuditEvent.entity_id == current.id, AuditEvent.action == "season.dates_set"))
    assert event.after == {"startsOn": starts_on.isoformat(), "endsOn": ends_on.isoformat()}


@pytest.mark.parametrize(
    ("starts_in", "ends_in", "code"),
    [(10, 5, "season_dates_reversed"), (1, 60, "season_starts_in_future"), (-300, 60, "season_dates_overlap"), (-10, 300, "season_dates_overlap")],
)
def test_dates_that_make_no_sense_are_refused(client: TestClient, headers: dict[str, str], seasons: tuple[Season, Season, Season], starts_in: int, ends_in: int, code: str) -> None:
    """
    A Season ends after it starts, an open one has started, and it never covers a day of the one before or after.
    """
    today = get_local_today()

    body = move(client, headers, seasons[1], today + timedelta(days=starts_in), today + timedelta(days=ends_in))

    assert body == {"code": code}


def test_a_closed_season_keeps_its_dates(client: TestClient, headers: dict[str, str], seasons: tuple[Season, Season, Season]) -> None:
    """
    What a closed Season settled stays: it is reopened first.
    """
    past = seasons[0]

    assert move(client, headers, past, past.starts_on, past.ends_on + timedelta(days=5)) == {"code": "season_closed"}


def test_moving_dates_needs_season_manage(client: TestClient, db: Session, seasons: tuple[Season, Season, Season]) -> None:
    """
    Without season.manage, the dates stay.
    """
    site = create_site(db)
    manager = create_staff_user(db, "+212669990501")
    db.commit()
    rights = {site.id: [Permission.CONFIGURATION_MANAGE]}
    current = seasons[1]

    assert move(client, build_auth_header(manager, rights), current, current.starts_on, current.ends_on) == {"code": "season_forbidden"}


@pytest.mark.parametrize("days", [-20, 20])
def test_a_prepared_season_keeps_its_prices_from_its_new_first_day(client: TestClient, db: Session, headers: dict[str, str], seasons: tuple[Season, Season, Season], days: int) -> None:
    """
    Prices carried over start on the Season's first day, wherever it moves; the last one set that day still wins.
    """
    site, planned = create_site(db), seasons[2]
    for value in ("0.50", "0.60"):
        db.add(SiteSetting(site_id=site.id, season_id=planned.id, key=SettingKey.MILLING_RATE_PER_KG, value=Decimal(value), effective_from=get_local_midnight(planned.starts_on)))
        db.flush()
    db.commit()
    starts_on = planned.starts_on + timedelta(days=days)

    move(client, headers, planned, starts_on, planned.ends_on)

    assert client.get(f"/api/configuration/{site.id}?seasonId={planned.id}", headers=headers).json()["millingRate"] == 0.6
    starts = set(db.scalars(select(SiteSetting.effective_from).where(SiteSetting.season_id == planned.id, SiteSetting.site_id == site.id)))
    assert starts == {get_local_midnight(starts_on)}


def test_an_open_season_moved_later_keeps_its_prices_in_force(client: TestClient, db: Session, headers: dict[str, str], seasons: tuple[Season, Season, Season]) -> None:
    """
    Moving the first day to today never leaves the Site on the default price.
    """
    site, current = create_site(db), seasons[1]
    db.add(SiteSetting(site_id=site.id, season_id=current.id, key=SettingKey.MILLING_RATE_PER_KG, value=Decimal("0.70"), effective_from=get_local_midnight(current.starts_on)))
    db.commit()

    move(client, headers, current, get_local_today(), current.ends_on)

    assert client.get(f"/api/configuration/{site.id}", headers=headers).json()["millingRate"] == 0.7


def test_expenses_paid_around_the_first_day_follow_it(client: TestClient, db: Session, headers: dict[str, str], seasons: tuple[Season, Season, Season]) -> None:
    """
    An Expense counts in the last Season started by its payment date: moving that start moves it, there and back.
    """
    past, current, _ = seasons
    expense = add_paid_expense(db, create_site(db), past, get_local_today() - timedelta(days=20))
    original_start = current.starts_on

    move(client, headers, current, get_local_today() - timedelta(days=30), current.ends_on)
    db.refresh(expense)
    earlier = expense.season_id
    move(client, headers, current, original_start, current.ends_on)
    db.refresh(expense)

    assert (earlier, expense.season_id) == (current.id, past.id)


@pytest.mark.parametrize(("starts_on", "year"), [(date(2026, 11, 1), 2026), (date(2026, 10, 15), 2026), (date(2027, 1, 4), 2026)])
def test_a_season_moved_to_the_winter_keeps_its_harvest_year(starts_on: date, year: int) -> None:
    """
    The next Season is named after the harvest, not after the calendar year of the day it was moved to.
    """
    assert get_harvest_year(starts_on) == year


def add_paid_expense(db: Session, site: Site, season: Season, day: date) -> Expense:
    """
    Add a paid Expense.

    Args:
        db (Session): Test session.
        site (Site): Site that paid.
        season (Season): Season it counts in.
        day (date): Payment date.

    Returns:
        Expense: The Expense.
    """
    if db.get(ExpenseCategory, "electricity") is None:
        db.add(ExpenseCategory(id="energy", type=ExpenseCategoryType.CATEGORY, position=1, vat_nature=ExpenseVatNature.NONE))
        db.flush()
        db.add(ExpenseCategory(id="electricity", type=ExpenseCategoryType.SUBCATEGORY, parent_id="energy", position=1, vat_nature=ExpenseVatNature.GOOD))
        db.flush()
    expense = Expense(id=uuid4(), site_id=site.id, season_id=season.id, payment_state=ExpensePaymentState.PAID, date=day, category_id="electricity", amount=Decimal("100"), paid_by=ExpensePaidBy.CASH)
    db.add(expense)
    db.commit()
    return expense
