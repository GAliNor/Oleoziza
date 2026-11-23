import base64
import io
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from core.exceptions import StorageError
from core.integrations.rustfs.rustfs_client import get_rustfs_client
from main import app
from modules.configuration.models.configuration_models import Box, PressLine
from modules.lot.models.lot_models import Lot
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


API_URL = "/api/lot/lots"

RIGHTS = [Permission.RECEPTION_CREATE, Permission.PRESSING_CREATE]


class FakeStorage:
    """
    Stands in for RustFS: keeps uploaded keys, signs fake URLs, and can be down.
    """

    def __init__(self) -> None:
        """
        Start empty and up.
        """
        self.keys: list[str] = []
        self.is_down = False

    def upload_object(self, key: str, content: Any, content_type: str, is_private: bool) -> None:
        """
        Remember an uploaded key, or fail while down.

        Args:
            key (str): Object key.
            content (Any): File content.
            content_type (str): MIME type.
            is_private (bool): Bucket visibility.

        Raises:
            StorageError: While down.
        """
        if self.is_down:
            raise StorageError("down")
        self.keys.append(key)

    def build_signed_url(self, key: str) -> str:
        """
        Sign a key.

        Args:
            key (str): Object key.

        Returns:
            str: Fake signed URL.
        """
        return f"https://storage.test/{key}"


@pytest.fixture
def storage() -> Iterator[FakeStorage]:
    """
    Serve the app with a fake RustFS.

    Returns:
        Iterator[FakeStorage]: The fake storage.
    """
    fake = FakeStorage()
    app.dependency_overrides[get_rustfs_client] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_rustfs_client, None)


@pytest.fixture
def mill(client: TestClient, db: Session, storage: FakeStorage) -> tuple:
    """
    A Site with an open Season, a Press Line, a Box and a Client, and an Operator.

    Args:
        client (TestClient): Test client, so the app is up first.
        db (Session): Test session.
        storage (FakeStorage): Fake storage.

    Returns:
        tuple: Site, Press Line, a Client's id and the Operator's headers.
    """
    site = create_site(db)
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add_all([line, Box(site_id=site.id, number=1, capacity_in_kg=Decimal("1000"))])
    db.flush()
    first_lot = create_lot(db, site, line.id)
    operator = create_staff_user(db, "+212669990750", permissions_by_site={site.id: RIGHTS})
    db.commit()
    return site, line, first_lot.client_id, build_auth_header(operator, {site.id: RIGHTS})


def build_photo() -> str:
    """
    Build a small photo as the front sends it.

    Returns:
        str: Data URL.
    """
    output = io.BytesIO()
    Image.new("RGB", (40, 30), "green").save(output, "JPEG")
    return f"data:image/jpeg;base64,{base64.b64encode(output.getvalue()).decode()}"


def receive(client: TestClient, mill: tuple, **fields: object) -> dict:
    """
    Receive a Lot with no Press Line, only with what a test is about.

    Args:
        client (TestClient): Test client.
        mill (tuple): The mill.
        **fields (object): Fields overriding the minimum.

    Returns:
        dict: The answer.
    """
    site, _, client_id, headers = mill
    payload = {"id": str(uuid7()), "siteId": str(site.id), "clientId": str(client_id), "mode": "service_milling", "variety": "Haouzia", "netKg": 800, "millingRatePerKg": 0.5, "notificationChoice": "none", "boxNumbers": [], "areBoxesIgnored": True, **fields}
    return client.post(API_URL, json=payload, headers=headers).json()


def test_a_reception_photo_is_kept_and_read_back(client: TestClient, mill: tuple, storage: FakeStorage) -> None:
    """
    Q11: the photo taken at Reception comes back on the Lot's timeline.
    """
    lot = receive(client, mill, photoUrl=build_photo())

    photos = client.get(f"{API_URL}/{lot['id']}/photos", headers=mill[3]).json()

    assert lot["photoSteps"] == ["reception"]
    assert photos == {"reception": f"https://storage.test/{storage.keys[0]}"}


@pytest.mark.parametrize("photo", ["data:image/jpeg;base64,bm90IGFuIGltYWdl", "blob:nothing"])
def test_an_unreadable_photo_never_loses_the_lot(client: TestClient, mill: tuple, photo: str) -> None:
    """
    Q11: the Lot is saved without it.
    """
    lot = receive(client, mill, photoUrl=photo)

    assert (lot["status"], lot["photoSteps"]) == ("waiting", [])


def test_a_photo_the_storage_refuses_never_loses_the_lot(client: TestClient, mill: tuple, storage: FakeStorage) -> None:
    """
    Q11: the Lot is saved while the storage is down.
    """
    storage.is_down = True

    lot = receive(client, mill, photoUrl=build_photo())

    assert (lot["status"], lot["photoSteps"]) == ("waiting", [])


def test_a_step_photo_is_kept_with_its_step(client: TestClient, mill: tuple) -> None:
    """
    Each move may carry its photo.
    """
    lot = receive(client, mill)

    moved = client.post(f"{API_URL}/{lot['id']}/moves", json={"id": str(uuid7()), "pressLineId": str(mill[1].id), "photoUrl": build_photo()}, headers=mill[3]).json()

    assert (moved["status"], moved["photoSteps"]) == ("pressing", ["pressing_started"])


def test_a_lot_is_received_without_a_press_line_and_keeps_its_boxes(client: TestClient, mill: tuple) -> None:
    """
    Q8: « Plus tard » leaves the Malaxeur and the planned start empty; the Lot waits like any other.
    """
    lot = receive(client, mill, boxNumbers=[1], areBoxesIgnored=False)

    assert (lot["status"], lot["pressLineId"], lot["plannedStartAt"], lot["boxNumbers"]) == ("waiting", None, None, [1])


def test_a_press_line_without_a_start_is_refused(client: TestClient, mill: tuple) -> None:
    """
    Both or neither.
    """
    assert receive(client, mill, pressLineId=str(mill[1].id)) == {"code": "line_incomplete"}


def test_a_lot_without_press_line_is_given_one_later_then_pressed(client: TestClient, mill: tuple) -> None:
    """
    Q8: assigned later through « Planifier le pressage », then pressed on it.
    """
    lot = receive(client, mill)
    line_id = str(mill[1].id)

    planned = client.put(f"{API_URL}/{lot['id']}/schedule", json={"id": str(uuid7()), "pressLineId": line_id, "plannedStartAt": "2026-11-24T08:00:00Z"}, headers=mill[3]).json()
    pressing = client.post(f"{API_URL}/{lot['id']}/moves", json={"id": str(uuid7())}, headers=mill[3]).json()

    assert planned["pressLineId"] == line_id
    assert (pressing["status"], pressing["pressLineId"]) == ("pressing", line_id)


def test_pressing_a_lot_without_press_line_asks_for_one(client: TestClient, mill: tuple) -> None:
    """
    Q8: at the latest when its Pressing starts.
    """
    lot = receive(client, mill)

    refused = client.post(f"{API_URL}/{lot['id']}/moves", json={"id": str(uuid7())}, headers=mill[3]).json()
    started = client.post(f"{API_URL}/{lot['id']}/moves", json={"id": str(uuid7()), "pressLineId": str(mill[1].id)}, headers=mill[3]).json()

    assert refused == {"code": "lot_without_line"}
    assert started["status"] == "pressing" and started["plannedStartAt"] is not None


def test_lots_without_press_line_are_read_ten_by_ten_oldest_first(client: TestClient, db: Session, mill: tuple) -> None:
    """
    Q9: 25 of them come as 10, 10 then 5, with their total; one given a Malaxeur leaves the list.
    """
    now = datetime.now(timezone.utc)
    ids = [receive(client, mill, enteredAt=(now - timedelta(minutes=100 - index)).isoformat())["id"] for index in range(25)]
    site, line, _, headers = mill

    def page(offset: int) -> dict:
        return client.get(f"{API_URL}/without-line", params={"siteId": str(site.id), "offset": offset, "limit": 10}, headers=headers).json()

    pages = [page(offset) for offset in (0, 10, 20)]
    client.put(f"{API_URL}/{ids[0]}/schedule", json={"id": str(uuid7()), "pressLineId": str(line.id), "plannedStartAt": "2026-11-24T08:00:00Z"}, headers=headers)

    assert [item["id"] for part in pages for item in part["items"]] == ids
    assert ([len(part["items"]) for part in pages], pages[0]["total"], page(0)["total"]) == ([10, 10, 5], 25, 24)


def test_lots_of_another_site_are_not_read(client: TestClient, db: Session, mill: tuple) -> None:
    """
    An Operator sees their own Site's.
    """
    receive(client, mill)
    other_site = create_site(db, "TO")
    db.commit()
    stranger = create_staff_user(db, "+212669990751", permissions_by_site={other_site.id: RIGHTS})

    body = client.get(f"{API_URL}/without-line", headers=build_auth_header(stranger, {other_site.id: RIGHTS})).json()

    assert body == {"items": [], "total": 0}
    assert db.query(Lot).filter_by(press_line_id=None, site_id=mill[0].id).count() == 1
