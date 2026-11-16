from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from modules.configuration.models.configuration_models import Box, OliveVariety, PressLine
from modules.user.types.user_types import Permission
from tests.factories import TEST_VARIETY_ID, build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


API_URL = "/api/lot/lots"


def prepare_site(db: Session) -> tuple:
    """
    Add a Site with an open Season, a Press Line, three Boxes and a Client (through a first Lot), and an Operator receiving there.

    Args:
        db (Session): Test session.

    Returns:
        tuple: Site, Press Line, the first Lot, and the Operator's headers.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    press_line = PressLine(site_id=site.id, number=1)
    db.add(press_line)
    db.add_all([Box(site_id=site.id, number=number, capacity_in_kg=Decimal("1000")) for number in (1, 2, 3)])
    if db.get(OliveVariety, TEST_VARIETY_ID) is None:
        db.add(OliveVariety(id=TEST_VARIETY_ID, name="Haouzia", is_active=True))
    db.flush()
    first_lot = create_lot(db, site, press_line.id)
    operator = create_staff_user(db, "+212669990701", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]})
    db.commit()
    return site, season, press_line, first_lot, build_auth_header(operator, {site.id: [Permission.RECEPTION_CREATE]})


def build_reception(site_id: object, client_id: object, press_line_id: object, boxes: list[int], lot_id: object | None = None) -> dict[str, object]:
    """
    Build the body of one Reception.

    Returns:
        dict[str, object]: Request body.
    """
    return {
        "id": str(lot_id or uuid7()),
        "siteId": str(site_id),
        "clientId": str(client_id),
        "mode": "service_milling",
        "variety": "Haouzia",
        "netKg": 1250,
        "millingRatePerKg": 0.5,
        "notificationChoice": "sms",
        "boxNumbers": boxes,
        "pressLineId": str(press_line_id),
        "plannedStartAt": "2026-11-20T08:00:00Z",
    }


def test_a_reception_becomes_a_waiting_lot_with_its_code_and_boxes(client: TestClient, db: Session) -> None:
    """
    The Lot gets the next code of its Site and Season, fills its Boxes, and reads its variety by name.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)

    lot = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [1, 2]), headers=headers).json()

    assert lot["code"] == f"TS-{season.code}-0001"
    assert (lot["status"], lot["boxNumbers"], lot["variety"], lot["clientName"]) == ("waiting", [1, 2], "Haouzia", "Test Client")
    assert [move["status"] for move in lot["moves"]] == ["waiting"]


def test_a_replayed_reception_answers_the_same_lot(client: TestClient, db: Session) -> None:
    """
    The outbox replaying a Reception never creates a second Lot nor takes a second code.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)
    lot_id = uuid7()

    first = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [1], lot_id), headers=headers).json()
    replay = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [1], lot_id), headers=headers).json()

    assert first["code"] == replay["code"]


def test_a_box_holding_a_lot_is_refused(client: TestClient, db: Session) -> None:
    """
    One Lot per Box: a second Reception into a full Box is refused.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)
    client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [3]), headers=headers)

    response = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [3]), headers=headers)

    assert response.json() == {"code": "box_taken"}


def test_the_list_reads_the_open_season_of_the_sites_held(client: TestClient, db: Session) -> None:
    """
    The Operator's list holds the open Season's Lots of their Site, newest first.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)
    created = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [2]), headers=headers).json()

    lots = client.get(API_URL, params={"siteId": str(site.id)}, headers=headers).json()

    assert [lot["id"] for lot in lots][:2] == [created["id"], str(first_lot.id)]
