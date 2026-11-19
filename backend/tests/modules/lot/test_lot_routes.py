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


def build_reception(site_id: object, client_id: object, press_line_id: object, boxes: list[int], lot_id: object | None = None, net_kg: float = 900, are_boxes_ignored: bool = False) -> dict[str, object]:
    """
    Build the body of one Reception; each test Box holds 1000 kg.

    Returns:
        dict[str, object]: Request body.
    """
    return {
        "id": str(lot_id or uuid7()),
        "siteId": str(site_id),
        "clientId": str(client_id),
        "mode": "service_milling",
        "variety": "Haouzia",
        "netKg": net_kg,
        "millingRatePerKg": 0.5,
        "notificationChoice": "sms",
        "boxNumbers": boxes,
        "areBoxesIgnored": are_boxes_ignored,
        "pressLineId": str(press_line_id),
        "plannedStartAt": "2026-11-20T08:00:00Z",
    }


def test_a_reception_becomes_a_waiting_lot_with_its_code_and_boxes(client: TestClient, db: Session) -> None:
    """
    The Lot gets the next code of its Site and Season, fills its Boxes, and reads its variety by name.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)

    lot = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [1, 2], net_kg=1250), headers=headers).json()

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


def test_boxes_too_small_for_the_weight_are_refused(client: TestClient, db: Session) -> None:
    """
    Two 1000 kg Boxes can't hold 2001 kg: the Reception is refused and no Lot is saved.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)
    lot_id = uuid7()

    response = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [1, 2], lot_id, net_kg=2001), headers=headers)

    assert (response.status_code, response.json()) == (422, {"code": "box_capacity_short"})
    assert client.get(f"{API_URL}/{lot_id}", headers=headers).status_code == 404


def test_boxes_holding_exactly_the_weight_are_enough(client: TestClient, db: Session) -> None:
    """
    Equal capacity is enough: 2000 kg fit two 1000 kg Boxes.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)

    response = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [1, 2], net_kg=2000), headers=headers)

    assert response.status_code == 200


def test_a_reception_without_boxes_is_refused_unless_boxes_are_ignored(client: TestClient, db: Session) -> None:
    """
    No Box means no room, unless the Operator ticked « Ignorer les Box »: then the Lot is saved with the Boxes picked, here none.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)

    refused = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, []), headers=headers)
    lot = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [], are_boxes_ignored=True), headers=headers).json()

    assert refused.json() == {"code": "box_capacity_short"}
    assert (lot["status"], lot["boxNumbers"]) == ("waiting", [])


def test_ignored_boxes_keep_the_boxes_picked(client: TestClient, db: Session) -> None:
    """
    With Boxes ignored, a 1500 kg Lot fills the one Box picked and the rest stays outside.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)

    lot = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [2], net_kg=1500, are_boxes_ignored=True), headers=headers).json()

    assert lot["boxNumbers"] == [2]


def test_the_list_reads_the_open_season_of_the_sites_held(client: TestClient, db: Session) -> None:
    """
    The Operator's list holds the open Season's Lots of their Site, newest first.
    """
    site, season, press_line, first_lot, headers = prepare_site(db)
    created = client.post(API_URL, json=build_reception(site.id, first_lot.client_id, press_line.id, [2]), headers=headers).json()

    lots = client.get(API_URL, params={"siteId": str(site.id)}, headers=headers).json()

    assert [lot["id"] for lot in lots][:2] == [created["id"], str(first_lot.id)]
