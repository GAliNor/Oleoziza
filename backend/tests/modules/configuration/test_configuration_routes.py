import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.helpers import get_local_today
from modules.configuration.models.configuration_models import Box, PressLine, Tank
from modules.lot.types.lot_types import LotStatus
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


def test_several_sites_are_read_in_one_request_and_none_means_every_held_site(client: TestClient, db: Session) -> None:
    """
    « Tous les sites » is one request: the Sites named by repeated siteId, or every Site the caller holds when none is named.
    """
    site = create_site(db)
    other_site = create_site(db, "TO")
    get_open_season(db)
    permissions = {site.id: [Permission.RECEPTION_CREATE], other_site.id: [Permission.RECEPTION_CREATE]}
    manager = create_staff_user(db, "+212669990103", permissions_by_site=permissions)
    headers = build_auth_header(manager, permissions)

    named = client.get(API_URL, params=[("siteId", str(site.id)), ("siteId", str(other_site.id))], headers=headers).json()
    held = client.get(API_URL, headers=headers).json()

    assert [configuration["siteId"] for configuration in named] == [str(site.id), str(other_site.id)]
    assert {configuration["siteId"] for configuration in held} == {str(site.id), str(other_site.id)}


def test_a_site_not_held_is_refused_in_a_batch(client: TestClient, db: Session) -> None:
    """
    Naming a Site the caller doesn't hold refuses the whole read.
    """
    site = create_site(db)
    other_site = create_site(db, "TO")
    get_open_season(db)
    operator = create_staff_user(db, "+212669990104", permissions_by_site={other_site.id: [Permission.RECEPTION_CREATE]})

    response = client.get(API_URL, params={"siteId": str(site.id)}, headers=build_auth_header(operator, {other_site.id: [Permission.RECEPTION_CREATE]}))

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
    B18: once a manager retires a Tank its number stays taken, and the page is given the next free one.
    """
    site = create_site(db)
    manager = create_staff_user(db, "+212669990107", permissions_by_site={site.id: [Permission.CONFIGURATION_MANAGE]})
    headers = build_auth_header(manager, {site.id: [Permission.CONFIGURATION_MANAGE]})
    tank = {"id": str(uuid.uuid4()), "number": 1, "capacityLitres": 500}
    client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": [tank]}, headers=headers)
    retired = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": []}, headers=headers).json()

    response = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "tanks": [{**tank, "id": str(uuid.uuid4())}]}, headers=headers)

    assert retired["nextTankNumber"] == 2
    assert response.json() == {"code": "number_taken"}


def test_press_lines_are_added_while_others_hold_waiting_lots(client: TestClient, db: Session) -> None:
    """
    Adding a Malaxeur keeps the ones already there, busy or not.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990108", is_owner=True)
    line = PressLine(site_id=site.id, number=1)
    db.add(line)
    db.flush()
    create_lot(db, site, line.id)
    kept = {"id": str(line.id), "number": 1, "name": ""}
    added = {"id": str(uuid.uuid4()), "number": 2, "name": "Petit"}

    body = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "pressLines": [kept, added]}, headers=build_auth_header(owner)).json()

    assert body["pressLines"] == [kept, added]


def test_an_owner_deletes_equipment_never_used_and_frees_its_number(client: TestClient, db: Session) -> None:
    """
    Q4a: a Box, Cuve or Malaxeur added by mistake really goes when an Owner removes it; its number is free again.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990109", is_owner=True)
    headers = build_auth_header(owner)

    def change(**part: object) -> dict:
        return client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), **part}, headers=headers).json()

    change(boxes={"count": 3, "capacityKg": 500})
    change(tanks=[{"id": str(uuid.uuid4()), "number": 1, "capacityLitres": 500}])
    change(pressLines=[{"id": str(uuid.uuid4()), "number": 1, "name": ""}])
    change(boxes={"count": 1, "capacityKg": 500})
    change(tanks=[])
    body = change(pressLines=[])

    assert (body["nextTankNumber"], body["nextPressLineNumber"]) == (1, 1)
    assert [db.query(model).filter_by(site_id=site.id).count() for model in (Box, Tank, PressLine)] == [1, 0, 0]


def test_an_owner_only_retires_equipment_a_lot_used(client: TestClient, db: Session) -> None:
    """
    A Malaxeur that pressed a Lot leaves the page but stays on that Lot, with its number.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990110", is_owner=True)
    line, other = PressLine(site_id=site.id, number=1), PressLine(site_id=site.id, number=2)
    db.add_all([line, other])
    db.flush()
    create_lot(db, site, line.id).status = LotStatus.PRESSED
    db.flush()

    body = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "pressLines": [{"id": str(other.id), "number": 2, "name": ""}]}, headers=build_auth_header(owner)).json()

    assert [item["number"] for item in body["pressLines"]] == [2]
    assert db.get(PressLine, line.id).retired_at is not None


def test_settings_outside_seasons_are_saved_without_an_open_season(client: TestClient, db: Session) -> None:
    """
    Q23: Payment Methods, Boxes, Cuves and Malaxeurs belong to no Season, so they are read and saved while none is open.
    """
    site = create_site(db)
    open_fresh_season(db).status = SeasonStatus.CLOSED
    db.flush()
    owner = create_staff_user(db, "+212669990111", is_owner=True)
    headers = build_auth_header(owner)

    read = client.get(f"{API_URL}/{site.id}", headers=headers).json()
    method = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "method": {"key": "cash", "isEnabled": True, "needsProof": True}}, headers=headers).json()
    boxes = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "boxes": {"count": 4, "capacityKg": 900}}, headers=headers).json()

    assert (read["seasonId"], read["seasonStatus"], read["millingRate"]) == (None, None, 0.5)
    assert method["methods"][0] == {"key": "cash", "isEnabled": True, "needsProof": True}
    assert boxes["boxCount"] == 4


def test_a_price_still_needs_a_season(client: TestClient, db: Session) -> None:
    """
    Q23: a price belongs to a Season, so without an open one it is refused unless its Season is named.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    season.status = SeasonStatus.PLANNED
    db.flush()
    headers = build_auth_header(create_staff_user(db, "+212669990112", is_owner=True))
    price = {"key": "oilPrice", "amount": 45}

    unnamed = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "value": price}, headers=headers).json()
    planned = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "seasonId": str(season.id), "value": price}, headers=headers).json()

    assert unnamed == {"code": "season_not_open"}
    assert planned["oilPrice"] == 45


def test_an_owner_deletes_a_price_in_force_and_the_previous_one_applies_again(client: TestClient, db: Session) -> None:
    """
    Q4a: a wrong price goes; the one before it, or the default, is back in force.
    """
    site = create_site(db)
    open_fresh_season(db)
    headers = build_auth_header(create_staff_user(db, "+212669990113", is_owner=True))

    def set_rate(amount: float) -> dict:
        return client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "value": {"key": "millingRate", "amount": amount}}, headers=headers).json()

    set_rate(0.6)
    body = set_rate(70)
    without_wrong = client.delete(f"{API_URL}/{site.id}/price-changes/{body['priceChanges'][1]['id']}", headers=headers).json()
    without_any = client.delete(f"{API_URL}/{site.id}/price-changes/{body['priceChanges'][0]['id']}", headers=headers).json()

    assert (without_wrong["millingRate"], without_any["millingRate"]) == (0.6, 0.5)


def test_a_price_in_force_is_deleted_by_an_owner_only_and_never_in_a_closed_season(client: TestClient, db: Session) -> None:
    """
    Q4a: deleting a price in force is the Owner's, and a closed Season keeps its prices.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    manager = create_staff_user(db, "+212669990114", permissions_by_site={site.id: [Permission.CONFIGURATION_MANAGE]})
    manager_headers = build_auth_header(manager, {site.id: [Permission.CONFIGURATION_MANAGE]})
    owner_headers = build_auth_header(create_staff_user(db, "+212669990115", is_owner=True))
    body = client.patch(f"{API_URL}/{site.id}", json={"id": str(uuid.uuid4()), "value": {"key": "millingRate", "amount": 0.6}}, headers=manager_headers).json()
    url = f"{API_URL}/{site.id}/price-changes/{body['priceChanges'][0]['id']}"

    by_manager = client.delete(url, headers=manager_headers).json()
    season.status = SeasonStatus.CLOSED
    db.flush()
    once_closed = client.delete(url, headers=owner_headers).json()

    assert by_manager == {"code": "owner_only"}
    assert once_closed == {"code": "season_closed"}


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
