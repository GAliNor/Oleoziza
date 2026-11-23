from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from core.helpers import get_local_today
from modules.audit.business.audit_events import record_audit_event
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


def read_journal(client: TestClient, site_id: object, headers: dict[str, str]) -> list[dict]:
    """
    Read a Site's Journal of today.

    Args:
        client (TestClient): Test client.
        site_id (object): Site.
        headers (dict[str, str]): Who reads.

    Returns:
        list[dict]: The events, newest first.
    """
    return client.get("/api/audit/journal", params={"siteId": str(site_id), "day": get_local_today().isoformat(), "limit": 100}, headers=headers).json()["items"]


def test_a_setting_changed_is_named_with_its_old_and_new_values(client: TestClient, db: Session) -> None:
    """
    Q19: the Journal says which setting changed, from what to what, never a technical word.
    """
    site = create_site(db)
    open_fresh_season(db)
    headers = build_auth_header(create_staff_user(db, "+212669991102", is_owner=True))

    def change(**part: object) -> None:
        client.patch(f"/api/configuration/{site.id}", json={"id": str(uuid7()), **part}, headers=headers)

    first_line, second_line = {"id": str(uuid7()), "number": 1, "name": ""}, {"id": str(uuid7()), "number": 2, "name": ""}
    change(value={"key": "millingRate", "amount": 0.7})
    change(method={"key": "cheque", "isEnabled": True, "needsProof": True})
    change(boxes={"count": 4, "capacityKg": 900})
    change(pressLines=[first_line, second_line])
    change(pressLines=[{**first_line, "name": "Grand"}])

    told = [event["params"] for event in reversed(read_journal(client, site.id, headers))]

    assert told == [
        {"key": "millingRate", "change": "value", "from": 0.5, "to": 0.7},
        {"key": "cheque", "change": "method", "proof": "on"},
        {"key": "boxes", "change": "boxes", "countFrom": 0, "countTo": 4, "capacityFrom": 0, "capacityTo": 900.0},
        {"key": "pressLines", "change": "pressLines", "added": "1, 2"},
        {"key": "pressLines", "change": "pressLines", "removed": "2", "changed": "1"},
    ]


def test_a_setting_changed_before_old_values_were_kept_is_still_named(client: TestClient, db: Session) -> None:
    """
    Events recorded by earlier versions have no `before`: the new value is told alone.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669991103", is_owner=True)
    record_audit_event(db, owner.id, "configuration.changed", site_id=site.id, entity_type="site", entity_id=site.id, after={"key": "oilPrice", "value": 50.0, "method": None})
    db.commit()

    told = read_journal(client, site.id, build_auth_header(owner))

    assert [event["params"] for event in told] == [{"key": "oilPrice", "change": "value", "to": 50.0}]


def test_deleted_prices_rate_corrections_and_press_line_changes_are_told(client: TestClient, db: Session) -> None:
    """
    Q19: what was silent is told: a price deleted, a Lot's rate corrected with its reason, a Lot moved to another Malaxeur.
    """
    site = create_site(db)
    open_fresh_season(db)
    headers = build_auth_header(create_staff_user(db, "+212669991104", is_owner=True))
    line, other_line = PressLine(site_id=site.id, number=1), PressLine(site_id=site.id, number=2)
    db.add_all([line, other_line])
    db.flush()
    lot = create_lot(db, site, line.id)
    lot.code = "TS-0001"
    db.commit()
    price = client.patch(f"/api/configuration/{site.id}", json={"id": str(uuid7()), "value": {"key": "oilPrice", "amount": 45}}, headers=headers).json()["priceChanges"][0]
    client.delete(f"/api/configuration/{site.id}/price-changes/{price['id']}", headers=headers)
    client.post(f"/api/lot/lots/{lot.id}/rate", json={"id": str(uuid7()), "millingRatePerKg": 0.45, "reason": "Olives abîmées"}, headers=headers)
    client.put(f"/api/lot/lots/{lot.id}/schedule", json={"id": str(uuid7()), "pressLineId": str(other_line.id), "plannedStartAt": "2026-11-24T08:00:00Z"}, headers=headers)

    told = {event["kind"]: event for event in read_journal(client, site.id, headers)}

    assert told["rate_corrected"]["params"] == {"code": "TS-0001", "from": 0.5, "to": 0.45, "reason": "Olives abîmées"}
    assert told["rate_corrected"]["isMoney"] is True
    assert (told["scheduled"]["params"]["code"], told["scheduled"]["params"]["lineNumber"]) == ("TS-0001", 2)
    assert {"key": "oilPrice", "change": "deleted", "from": 45.0, "to": 40.0} in [event["params"] for event in read_journal(client, site.id, headers)]
