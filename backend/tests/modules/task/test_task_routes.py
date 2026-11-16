from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from modules.configuration.models.configuration_models import PressLine
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


def test_the_to_do_list_reads_what_waits_on_each_right(client: TestClient, db: Session) -> None:
    """
    A pending Payment waits on whoever confirms Payments, and its unpaid Lot puts the Client in the follow-up; without those rights nothing shows.
    """
    site = create_site(db)
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add(line)
    db.flush()
    lot = create_lot(db, site, line.id)
    cashier = create_staff_user(db, "+212669991301", permissions_by_site={site.id: [Permission.PAYMENT_RECORD]})
    manager_rights = [Permission.PAYMENT_CONFIRM, Permission.CLIENT_VIEW]
    manager = create_staff_user(db, "+212669991302", permissions_by_site={site.id: manager_rights})
    db.commit()
    payment = {"id": str(uuid7()), "siteId": str(site.id), "clientId": str(lot.client_id), "lotLinks": [{"lotId": str(lot.id), "amount": 200}], "amount": 200, "method": "cheque"}
    client.post("/api/finance/payments", json=payment, headers=build_auth_header(cashier, {site.id: [Permission.PAYMENT_RECORD]}))

    manager_tasks = client.get("/api/task/tasks", params={"siteId": str(site.id)}, headers=build_auth_header(manager, {site.id: manager_rights})).json()
    cashier_tasks = client.get("/api/task/tasks", params={"siteId": str(site.id)}, headers=build_auth_header(cashier, {site.id: [Permission.PAYMENT_RECORD]})).json()

    assert sorted(task["kind"] for task in manager_tasks) == ["client-at-risk", "payment"]
    assert next(task for task in manager_tasks if task["kind"] == "client-at-risk")["amount"] == 300
    assert cashier_tasks == []
