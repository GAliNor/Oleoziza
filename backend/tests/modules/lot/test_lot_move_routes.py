from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from modules.configuration.models.configuration_models import Box, PressLine, Tank
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


API_URL = "/api/lot/lots"

OPERATOR_RIGHTS = [Permission.RECEPTION_CREATE, Permission.PRESSING_CREATE, Permission.DISCOUNT_GIVE]


def prepare_lot(db: Session, tank_capacity: str = "5000") -> tuple:
    """
    Add a Site with an open Season, a Press Line, a Tank, a waiting Lot and an Operator.

    Args:
        db (Session): Test session.
        tank_capacity (str): Litres the Tank holds.

    Returns:
        tuple: Lot, Tank, Press Line and the Operator's headers.
    """
    site = create_site(db)
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    tank = Tank(site_id=site.id, number=1, capacity_in_litres=Decimal(tank_capacity))
    db.add_all([line, tank, Box(site_id=site.id, number=1, capacity_in_kg=Decimal("1000"))])
    db.flush()
    lot = create_lot(db, site, line.id)
    operator = create_staff_user(db, "+212669990801", permissions_by_site={site.id: OPERATOR_RIGHTS})
    db.commit()
    return lot, tank, line, build_auth_header(operator, {site.id: OPERATOR_RIGHTS})


def test_a_lot_goes_from_pressing_to_tanks_to_the_client(client: TestClient, db: Session) -> None:
    """
    Start, end with part handed over and part in a Tank, then withdraw the rest: each step shows in the Lot's moves.
    """
    lot, tank, line, headers = prepare_lot(db)

    pressing = client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7())}, headers=headers).json()
    pressed = client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7()), "oilLitres": 200, "handedLitres": 50, "pours": [{"tankId": str(tank.id), "litres": 150}]}, headers=headers).json()
    withdrawn = client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7())}, headers=headers).json()

    assert pressing["status"] == "pressing"
    assert (pressed["status"], pressed["oilLitres"], pressed["withdrawnLitres"], pressed["storages"][0]["litres"]) == ("pressed", 200, 50, 150)
    assert (withdrawn["status"], withdrawn["withdrawnLitres"], withdrawn["storages"][0]["withdrawnLitres"]) == ("withdrawn", 200, 150)
    assert [move["status"] for move in withdrawn["moves"]] == ["waiting", "pressing", "pressed", "withdrawn"]


def test_a_replayed_step_moves_the_lot_once(client: TestClient, db: Session) -> None:
    """
    The outbox replaying a step answers the Lot as it is.
    """
    lot, tank, line, headers = prepare_lot(db)
    step = {"id": str(uuid7())}

    client.post(f"{API_URL}/{lot.id}/moves", json=step, headers=headers)
    replay = client.post(f"{API_URL}/{lot.id}/moves", json=step, headers=headers).json()

    assert replay["status"] == "pressing"


def test_the_oil_split_must_add_up_and_fit_the_tank(client: TestClient, db: Session) -> None:
    """
    Handed plus poured litres equal the oil, and a Tank never overflows.
    """
    lot, tank, line, headers = prepare_lot(db, tank_capacity="100")
    client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7())}, headers=headers)

    uneven = client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7()), "oilLitres": 200, "handedLitres": 10, "pours": [{"tankId": str(tank.id), "litres": 150}]}, headers=headers)
    overflow = client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7()), "oilLitres": 200, "handedLitres": 50, "pours": [{"tankId": str(tank.id), "litres": 150}]}, headers=headers)

    assert uneven.json() == {"code": "oil_split_invalid"}
    assert overflow.json() == {"code": "tank_full"}


def test_a_waiting_lot_changes_line_and_a_pressing_one_cannot(client: TestClient, db: Session) -> None:
    """
    A Lot is planned again until its Pressing starts.
    """
    lot, tank, line, headers = prepare_lot(db)
    schedule = {"pressLineId": str(line.id), "plannedStartAt": "2026-11-21T09:00:00Z"}

    planned = client.put(f"{API_URL}/{lot.id}/schedule", json={"id": str(uuid7()), **schedule}, headers=headers).json()
    client.post(f"{API_URL}/{lot.id}/moves", json={"id": str(uuid7())}, headers=headers)
    refused = client.put(f"{API_URL}/{lot.id}/schedule", json={"id": str(uuid7()), **schedule}, headers=headers)

    assert planned["plannedStartAt"].startswith("2026-11-21T09:00")
    assert refused.json() == {"code": "lot_already_pressing"}


def test_a_discount_above_the_limit_waits_for_a_decision(client: TestClient, db: Session) -> None:
    """
    With a 0 % limit, any Discount by an Operator waits; Management refusing it needs a reason.
    """
    lot, tank, line, headers = prepare_lot(db)
    manager = create_staff_user(db, "+212669990802", permissions_by_site={lot.site_id: [Permission.DISCOUNT_APPROVE]})
    db.commit()
    manager_headers = build_auth_header(manager, {lot.site_id: [Permission.DISCOUNT_APPROVE]})

    given = client.post(f"{API_URL}/{lot.id}/discount", json={"id": str(uuid7()), "amountDh": 50, "percent": 10}, headers=headers).json()
    without_reason = client.post(f"{API_URL}/{lot.id}/discount/decision", json={"id": str(uuid7()), "isApproved": False}, headers=manager_headers)
    refused = client.post(f"{API_URL}/{lot.id}/discount/decision", json={"id": str(uuid7()), "isApproved": False, "reason": "Trop élevé"}, headers=manager_headers).json()

    assert given["discount"]["state"] == "pending"
    assert without_reason.json() == {"code": "reason_required"}
    assert (refused["discount"]["state"], refused["discount"]["refusalReason"]) == ("refused", "Trop élevé")
