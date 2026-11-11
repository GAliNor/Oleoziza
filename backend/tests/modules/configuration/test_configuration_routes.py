import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.helpers import get_local_today
from modules.configuration.models.configuration_models import PressLine, Tank
from modules.oil.models.oil_models import Storage
from modules.oil.types.oil_types import StorageOwner
from modules.site.types.site_types import SeasonStatus
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, get_open_season, open_fresh_season


API_URL = "/api/configuration"


def test_staff_of_the_site_reads_the_open_season_prices_with_defaults(client: TestClient, db: Session) -> None:
    """
    A Site with no price set yet shows the defaults for the open Season to anyone assigned there.
    """
    site = create_site(db)
    season = get_open_season(db)
    operator = create_staff_user(db, "+212669990101", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]})

    body = client.get(f"{API_URL}/{site.id}", headers=build_auth_header(operator, {site.id: [Permission.RECEPTION_CREATE]})).json()

    assert body["seasonId"] == str(season.id)
    assert (body["millingRate"], body["discountLimit"], body["oilPrice"]) == (0.5, 0, 40)
    assert [method["key"] for method in body["methods"]] == ["cash", "cheque", "transfer", "oil"]


def test_staff_of_another_site_cannot_read(client: TestClient, db: Session) -> None:
    """
    Staff not assigned to a Site are refused its Configuration.
    """
    site = create_site(db)
    other_site = create_site(db, "TO")
    get_open_season(db)
    operator = create_staff_user(db, "+212669990102", permissions_by_site={other_site.id: [Permission.RECEPTION_CREATE]})

    response = client.get(f"{API_URL}/{site.id}", headers=build_auth_header(operator, {other_site.id: [Permission.RECEPTION_CREATE]}))

    assert response.json() == {"code": "site_forbidden"}


def test_a_price_change_is_recorded_once_with_its_author(client: TestClient, db: Session) -> None:
    """
    Sending the same change twice applies it once and lists it once in the history, with who made it.
    """
    site = create_site(db)
    get_open_season(db)
    manager = create_staff_user(db, "+212669990103", permissions_by_site={site.id: [Permission.CONFIGURATION_MANAGE]})
    headers = build_auth_header(manager, {site.id: [Permission.CONFIGURATION_MANAGE]})
    change = {"id": str(uuid.uuid4()), "value": {"key": "millingRate", "amount": 0.6}}

    client.patch(f"{API_URL}/{site.id}", json=change, headers=headers)
    body = client.patch(f"{API_URL}/{site.id}", json=change, headers=headers).json()

    assert body["millingRate"] == 0.6
    assert len(body["history"]) == 1
    assert body["history"][0]["by"] == f"{manager.first_name} {manager.last_name}"


def test_changing_needs_configuration_manage(client: TestClient, db: Session) -> None:
    """
    An Operator of the Site cannot change its Configuration.
    """
    site = create_site(db)
    get_open_season(db)
    operator = create_staff_user(db, "+212669990104", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]})

    response = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "value": {"key": "oilPrice", "amount": 45}}, headers=build_auth_header(operator, {site.id: [Permission.RECEPTION_CREATE]}))

    assert response.json() == {"code": "configuration_forbidden"}


def test_the_last_payment_method_stays_on(client: TestClient, db: Session) -> None:
    """
    Switching off every Payment Method is refused at the last one.
    """
    site = create_site(db)
    get_open_season(db)
    owner = create_staff_user(db, "+212669990105", is_owner=True)
    headers = build_auth_header(owner)
    for method in ("cash", "cheque", "transfer"):
        client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "method": {"key": method, "isEnabled": False, "needsProof": False}}, headers=headers)

    response = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "method": {"key": "oil", "isEnabled": False, "needsProof": False}}, headers=headers)

    assert response.json() == {"code": "last_method"}


def test_equipment_in_use_cannot_be_retired(client: TestClient, db: Session) -> None:
    """
    A Tank holding oil and a Press Line with a Lot planned on it stay; an empty Tank is retired.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990106", is_owner=True)
    headers = build_auth_header(owner)
    full_tank, empty_tank = Tank(site_id=site.id, number=1, capacity_in_litres=1000), Tank(site_id=site.id, number=2, capacity_in_litres=1000)
    line = PressLine(site_id=site.id, number=1)
    db.add_all([full_tank, empty_tank, line])
    db.flush()
    lot = create_lot(db, site, line.id)
    db.add(Storage(lot_id=lot.id, tank_id=full_tank.id, owner=StorageOwner.MILL, oil_in_litres=100, stored_from=datetime.now(timezone.utc), entered_at=datetime.now(timezone.utc)))
    db.commit()
    kept_full_tank = [{"id": str(full_tank.id), "number": 1, "capacityLitres": 1000}]

    tank_refused = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": []}, headers=headers)
    line_refused = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "pressLines": []}, headers=headers)
    empty_retired = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": kept_full_tank}, headers=headers)

    assert tank_refused.json() == {"code": "tank_in_use"}
    assert line_refused.json() == {"code": "line_in_use"}
    assert [tank["number"] for tank in empty_retired.json()["tanks"]] == [1]


def test_a_retired_tank_number_is_never_reused(client: TestClient, db: Session) -> None:
    """
    A new Tank cannot take the number of one retired before.
    """
    site = create_site(db)
    get_open_season(db)
    owner = create_staff_user(db, "+212669990107", is_owner=True)
    headers = build_auth_header(owner)
    client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": [{"id": str(uuid.uuid4()), "number": 1, "capacityLitres": 500}]}, headers=headers)
    client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": []}, headers=headers)

    response = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": [{"id": str(uuid.uuid4()), "number": 1, "capacityLitres": 500}]}, headers=headers)

    assert response.json() == {"code": "number_taken"}


def test_a_price_can_be_scheduled_and_cancelled_before_it_starts(client: TestClient, db: Session) -> None:
    """
    A change dated later in the open Season waits as scheduled, leaves today's price alone, and can be cancelled.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990110", is_owner=True)
    headers = build_auth_header(owner)
    later = (get_local_today() + timedelta(days=5)).isoformat()

    body = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "seasonId": str(season.id), "value": {"key": "millingRate", "amount": 0.7, "effectiveOn": later}}, headers=headers).json()
    scheduled = [change for change in body["priceChanges"] if change["isScheduled"]]
    cancelled = client.delete(f"{API_URL}/{site.id}/price-changes/{scheduled[0]['id']}", headers=headers).json()

    assert body["millingRate"] == 0.5
    assert [(change["key"], change["value"]) for change in scheduled] == [("millingRate", 0.7)]
    assert all(not change["isScheduled"] for change in cancelled["priceChanges"])


def test_a_price_cannot_start_in_the_past_or_outside_its_season(client: TestClient, db: Session) -> None:
    """
    In the open Season a change starts today at the earliest, and always within the Season.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990111", is_owner=True)
    headers = build_auth_header(owner)

    def change_on(day: str) -> dict:
        return client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "seasonId": str(season.id), "value": {"key": "oilPrice", "amount": 41, "effectiveOn": day}}, headers=headers).json()

    assert change_on((get_local_today() - timedelta(days=1)).isoformat()) == {"code": "date_in_past"}
    assert change_on((season.ends_on + timedelta(days=1)).isoformat()) == {"code": "date_outside_season"}


def test_a_closed_season_is_read_only(client: TestClient, db: Session) -> None:
    """
    The prices of a closed Season can be read but no longer changed.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    season.status = SeasonStatus.CLOSED
    open_fresh_season(db, "9797")
    owner = create_staff_user(db, "+212669990112", is_owner=True)
    headers = build_auth_header(owner)

    read = client.get(f"{API_URL}/{site.id}", params={"seasonId": str(season.id)}, headers=headers).json()
    change = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "seasonId": str(season.id), "value": {"key": "oilPrice", "amount": 41}}, headers=headers).json()

    assert read["seasonStatus"] == "closed"
    assert change == {"code": "season_closed"}
