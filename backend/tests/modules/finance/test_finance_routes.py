from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from modules.configuration.models.configuration_models import PressLine
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


API_URL = "/api/finance"

CASHIER_RIGHTS = [Permission.PAYMENT_RECORD, Permission.FINANCE_VIEW]

MANAGER_RIGHTS = [Permission.PAYMENT_CONFIRM, Permission.PAYMENT_CANCEL, Permission.REFUND_MANAGE, Permission.FINANCE_VIEW, Permission.RECEPTION_CREATE]


def prepare(db: Session) -> tuple:
    """
    Add a Site with an open Season, a 1,000 kg Lot at 0.50 DH/kg (500 DH), a cashier and a manager.

    Args:
        db (Session): Test session.

    Returns:
        tuple: Lot, cashier headers, manager headers.
    """
    site = create_site(db)
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add(line)
    db.flush()
    lot = create_lot(db, site, line.id)
    cashier = create_staff_user(db, "+212669990901", permissions_by_site={site.id: CASHIER_RIGHTS})
    manager = create_staff_user(db, "+212669990902", permissions_by_site={site.id: MANAGER_RIGHTS})
    db.commit()
    return lot, build_auth_header(cashier, {site.id: CASHIER_RIGHTS}), build_auth_header(manager, {site.id: MANAGER_RIGHTS})


def build_payment(lot: object, amount: float, link: float, **overrides: object) -> dict[str, object]:
    """
    Build the body of a cash Payment on one Lot.

    Returns:
        dict[str, object]: Request body.
    """
    body = {"id": str(uuid7()), "siteId": str(lot.site_id), "clientId": str(lot.client_id), "lotLinks": [{"lotId": str(lot.id), "amount": link}], "amount": amount, "method": "cash"}
    return {**body, **overrides}


def test_a_payment_waits_then_pays_the_lot_once_confirmed(client: TestClient, db: Session) -> None:
    """
    A cashier records a pending Payment with its code; once confirmed, the Lot reads it as paid.
    """
    lot, cashier, manager = prepare(db)

    recorded = client.post(f"{API_URL}/payments", json=build_payment(lot, 500, 500), headers=cashier).json()
    confirmed = client.post(f"{API_URL}/payments/{recorded['id']}/decision", json={"status": "confirmed"}, headers=manager).json()
    paid_lot = client.get(f"/api/lot/lots/{lot.id}", headers=manager).json()

    assert (recorded["status"], recorded["code"][3]) == ("pending", "P")
    assert confirmed["status"] == "confirmed"
    assert (paid_lot["paidDh"], paid_lot["pendingDh"]) == (500, 0)


def test_a_surplus_needs_a_settlement_and_becomes_credit_on_the_next_lot(client: TestClient, db: Session) -> None:
    """
    700 DH for a 500 DH Lot: confirming asks what to do with the 200 DH; as a Credit Note, it shows on the Client.
    """
    lot, cashier, manager = prepare(db)
    recorded = client.post(f"{API_URL}/payments", json=build_payment(lot, 700, 500), headers=cashier).json()

    unsettled = client.post(f"{API_URL}/payments/{recorded['id']}/decision", json={"status": "confirmed"}, headers=manager)
    settled = client.post(f"{API_URL}/payments/{recorded['id']}/decision", json={"status": "confirmed", "settlement": "credit_note"}, headers=manager).json()
    client_row = next(item for item in client.get("/api/client/clients", headers=manager).json() if item["id"] == str(lot.client_id))

    assert unsettled.json() == {"code": "surplus_not_settled"}
    assert settled["settlement"] == "credit_note"
    assert client_row["creditDh"] == 200


def test_a_cancelled_payment_refunded_is_confirmed_by_someone_else(client: TestClient, db: Session) -> None:
    """
    Cancelling a confirmed Payment as a Refund creates one to make; its maker can't confirm it.
    """
    lot, cashier, manager = prepare(db)
    other_manager = create_staff_user(db, "+212669990903", permissions_by_site={lot.site_id: MANAGER_RIGHTS})
    db.commit()
    recorded = client.post(f"{API_URL}/payments", json=build_payment(lot, 500, 500), headers=cashier).json()
    client.post(f"{API_URL}/payments/{recorded['id']}/decision", json={"status": "confirmed"}, headers=manager)
    client.post(f"{API_URL}/payments/{recorded['id']}/decision", json={"status": "cancelled", "settlement": "refund"}, headers=manager)
    refund = client.get(f"{API_URL}/refunds", params={"siteId": str(lot.site_id)}, headers=manager).json()[0]

    made = client.post(f"{API_URL}/refunds/{refund['id']}/made", json={"method": "cash"}, headers=manager).json()
    own = client.post(f"{API_URL}/refunds/{refund['id']}/confirm", headers=manager)
    confirmed = client.post(f"{API_URL}/refunds/{refund['id']}/confirm", headers=build_auth_header(other_manager, {lot.site_id: MANAGER_RIGHTS})).json()

    assert (refund["amount"], refund["status"], refund["sourceCode"]) == (500, "to_make", recorded["code"])
    assert made["status"] == "made"
    assert own.json() == {"code": "refund_own"}
    assert confirmed["status"] == "confirmed"


def test_the_sales_figures_add_up(client: TestClient, db: Session) -> None:
    """
    Revenue = collected + pending + outstanding over the Season's Lots.
    """
    lot, cashier, manager = prepare(db)
    client.post(f"{API_URL}/payments", json=build_payment(lot, 200, 200), headers=cashier)

    figures = client.get(f"{API_URL}/sales", params={"siteId": str(lot.site_id), "period": "season"}, headers=manager).json()["figures"]

    assert (figures["revenue"], figures["pending"], figures["outstanding"], figures["collected"], figures["pendingCount"]) == (500, 200, 300, 0, 1)


def test_the_register_pages_what_waits_for_a_decision(client: TestClient, db: Session) -> None:
    """
    The « to confirm » list pages the pending Payments with the list's size.
    """
    lot, cashier, manager = prepare(db)
    for _ in range(3):
        client.post(f"{API_URL}/payments", json=build_payment(lot, 100, 100), headers=cashier)

    page = client.get(f"{API_URL}/payments/page", params={"siteId": str(lot.site_id), "list": "pending", "limit": 2}, headers=manager).json()

    assert (len(page["items"]), page["total"]) == (2, 3)
