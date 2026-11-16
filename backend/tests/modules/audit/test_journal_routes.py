from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from core.helpers import get_local_today
from modules.configuration.models.configuration_models import Box, PressLine
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


RIGHTS = [Permission.RECEPTION_CREATE, Permission.DISCOUNT_GIVE, Permission.DASHBOARD_VIEW]


def test_the_journal_tells_the_day_and_hides_money_without_finance_view(client: TestClient, db: Session) -> None:
    """
    A Reception and a Discount show for a manager who sees the finances; without finance.view the Discount is hidden.
    """
    site = create_site(db)
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add_all([line, Box(site_id=site.id, number=1, capacity_in_kg=Decimal("1000"))])
    db.flush()
    first_lot = create_lot(db, site, line.id)
    operator = create_staff_user(db, "+212669991101", permissions_by_site={site.id: RIGHTS})
    db.commit()
    operator_headers = build_auth_header(operator, {site.id: RIGHTS})
    reception = {"id": str(uuid7()), "siteId": str(site.id), "clientId": str(first_lot.client_id), "mode": "service_milling", "variety": "Haouzia", "netKg": 800, "millingRatePerKg": 0.5, "notificationChoice": "none", "boxNumbers": [1], "pressLineId": str(line.id), "plannedStartAt": "2026-11-20T08:00:00Z"}
    lot = client.post("/api/lot/lots", json=reception, headers=operator_headers).json()
    client.post(f"/api/lot/lots/{lot['id']}/discount", json={"id": str(uuid7()), "amountDh": 20, "percent": 5}, headers=operator_headers)
    params = {"siteId": str(site.id), "day": get_local_today().isoformat()}
    with_money = {site.id: [*RIGHTS, Permission.FINANCE_VIEW]}

    seen_by_manager = client.get("/api/audit/journal", params=params, headers=build_auth_header(operator, with_money)).json()
    seen_by_operator = client.get("/api/audit/journal", params=params, headers=operator_headers).json()
    summary = client.get("/api/audit/journal/summary", params=params, headers=build_auth_header(operator, with_money)).json()

    assert [event["kind"] for event in seen_by_manager["items"]] == ["discount_pending", "reception"]
    assert [event["kind"] for event in seen_by_operator["items"]] == ["reception"]
    assert (summary["receptions"], summary["receivedKg"], summary["groupCounts"]["discount"]) == (1, 800, 1)
    assert seen_by_manager["items"][1]["entityId"] == lot["id"]
