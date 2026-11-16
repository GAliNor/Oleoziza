from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from core.helpers import get_local_today
from modules.expense.models.expense_models import ExpenseCategory
from modules.expense.types.expense_types import ExpenseCategoryType, ExpenseVatNature
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_site, create_staff_user, open_fresh_season


API_URL = "/api/expense"


def prepare(db: Session) -> tuple:
    """
    Add a Site with an open Season, the « energy › electricity » categories, and an Accountant keeping the register.

    Args:
        db (Session): Test session.

    Returns:
        tuple: Site, Season and the Accountant's headers.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    if db.get(ExpenseCategory, "energy") is None:
        db.add(ExpenseCategory(id="energy", type=ExpenseCategoryType.CATEGORY, position=2, vat_nature=ExpenseVatNature.NONE))
        db.flush()
        db.add(ExpenseCategory(id="electricity", type=ExpenseCategoryType.SUBCATEGORY, parent_id="energy", position=1, account_code="61251", vat_nature=ExpenseVatNature.GOOD))
    accountant = create_staff_user(db, "+212669991001", permissions_by_site={site.id: [Permission.EXPENSE_RECORD]})
    db.commit()
    return site, season, build_auth_header(accountant, {site.id: [Permission.EXPENSE_RECORD]})


def build_expense(site_id: object, **overrides: object) -> dict[str, object]:
    """
    Build the body of an electricity bill paid today.

    Returns:
        dict[str, object]: Request body.
    """
    body = {"id": str(uuid7()), "siteId": str(site_id), "date": get_local_today().isoformat(), "categoryId": "electricity", "description": "Facture ONEE novembre", "amount": 1200, "vatRate": 20, "supplier": "ONEE", "paidBy": "transfer"}
    return {**body, **overrides}


def test_an_expense_gets_its_code_and_its_supplier(client: TestClient, db: Session) -> None:
    """
    The Expense takes a C code of its Site and Season; a supplier typed by name is created once.
    """
    site, season, headers = prepare(db)

    first = client.post(f"{API_URL}/expenses", json=build_expense(site.id), headers=headers).json()
    second = client.post(f"{API_URL}/expenses", json=build_expense(site.id, supplier="onee"), headers=headers).json()

    assert first["code"] == f"TS-C{season.code}-0001"
    assert first["supplierId"] == second["supplierId"]


def test_only_a_subcategory_and_a_2026_rate_are_accepted(client: TestClient, db: Session) -> None:
    """
    A category alone, or a 14 % TVA, is refused.
    """
    site, season, headers = prepare(db)

    category = client.post(f"{API_URL}/expenses", json=build_expense(site.id, categoryId="energy"), headers=headers)
    rate = client.post(f"{API_URL}/expenses", json=build_expense(site.id, vatRate=14), headers=headers)

    assert category.json() == {"code": "category_invalid"}
    assert rate.json() == {"code": "vat_rate_invalid"}


def test_a_cancelled_expense_leaves_the_totals(client: TestClient, db: Session) -> None:
    """
    The summary derives the TVA and leaves a cancelled Expense out.
    """
    site, season, headers = prepare(db)
    kept = build_expense(site.id)
    cancelled = client.post(f"{API_URL}/expenses", json=build_expense(site.id, amount=600), headers=headers).json()
    client.post(f"{API_URL}/expenses", json=kept, headers=headers)
    client.post(f"{API_URL}/expenses/{cancelled['id']}/cancel", json={"reason": "Doublon"}, headers=headers)

    summary = client.get(f"{API_URL}/expenses/summary", params={"siteId": str(site.id), "period": "season"}, headers=headers).json()

    assert (summary["total"], summary["vat"], summary["count"], summary["byCategory"]) == (1200, 200, 1, [{"categoryId": "energy", "amount": 1200}])


def test_the_register_pages_and_filters_by_category(client: TestClient, db: Session) -> None:
    """
    The register reads page by page and by category.
    """
    site, season, headers = prepare(db)
    for _ in range(3):
        client.post(f"{API_URL}/expenses", json=build_expense(site.id), headers=headers)

    page = client.get(f"{API_URL}/expenses", params={"siteId": str(site.id), "category": "energy", "limit": 2}, headers=headers).json()

    assert (len(page["items"]), page["total"]) == (2, 3)
