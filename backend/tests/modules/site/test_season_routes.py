from collections.abc import Iterator
from decimal import Decimal
from typing import Any

import pytest

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.helpers import get_local_midnight
from core.integrations.rustfs.rustfs_client import get_rustfs_client
from main import app
from modules.configuration.models.configuration_models import SiteSetting
from modules.configuration.types.configuration_types import SettingKey
from modules.site.models.site_models import Season
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_site, create_staff_user, open_fresh_season


API_URL = "/api/site/seasons"


def test_preparing_the_next_season_carries_prices_over(client: TestClient, db: Session) -> None:
    """
    The next Season starts on 1 November after the latest one, is planned, and starts with each Site's last prices.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    db.add(SiteSetting(site_id=site.id, season_id=season.id, key=SettingKey.MILLING_RATE_PER_KG, value=Decimal("0.55"), effective_from=get_local_midnight(season.starts_on)))
    owner = create_staff_user(db, "+212669990300", is_owner=True)
    db.commit()

    body = client.post(API_URL, headers=build_auth_header(owner)).json()
    carried = db.scalar(select(SiteSetting.value).where(SiteSetting.season_id == body["id"], SiteSetting.site_id == site.id, SiteSetting.key == SettingKey.MILLING_RATE_PER_KG))

    assert body["status"] == "planned"
    assert body["startsOn"] == f"{season.starts_on.year + 1}-11-01"
    assert carried == Decimal("0.55")


def test_only_one_season_can_be_prepared(client: TestClient, db: Session) -> None:
    """
    A second Season cannot be prepared while one is already planned.
    """
    open_fresh_season(db)
    owner = create_staff_user(db, "+212669990301", is_owner=True)
    db.commit()
    client.post(API_URL, headers=build_auth_header(owner))

    response = client.post(API_URL, headers=build_auth_header(owner))

    assert response.json() == {"code": "season_already_planned"}


def test_opening_the_planned_season_closes_the_current_one(client: TestClient, db: Session) -> None:
    """
    Opening the prepared Season closes the one under way, so a single Season is ever open.
    """
    current = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990302", is_owner=True)
    db.commit()
    planned = client.post(API_URL, headers=build_auth_header(owner)).json()

    opened = client.post(f"{API_URL}/{planned['id']}/open", headers=build_auth_header(owner)).json()
    db.refresh(current)

    assert opened["status"] == "open"
    assert current.status == "closed"
    assert current.closed_at is not None


def test_managing_seasons_needs_season_manage(client: TestClient, db: Session) -> None:
    """
    Staff without season.manage cannot prepare a Season.
    """
    site = create_site(db)
    open_fresh_season(db)
    rights = {site.id: [Permission.CONFIGURATION_MANAGE]}
    manager = create_staff_user(db, "+212669990303", permissions_by_site=rights)

    response = client.post(API_URL, headers=build_auth_header(manager, rights))

    assert response.json() == {"code": "season_forbidden"}


def test_seasons_are_listed_oldest_first(client: TestClient, db: Session) -> None:
    """
    Every staff member sees the Seasons in order.
    """
    open_fresh_season(db)
    owner = create_staff_user(db, "+212669990304", is_owner=True)

    body = client.get(API_URL, headers=build_auth_header(owner)).json()

    assert [season["startsOn"] for season in body] == sorted(season["startsOn"] for season in body)
    assert db.scalar(select(Season.id).where(Season.code == "9898")) is not None


class FakeStorage:
    """
    Stands in for RustFS: keeps uploaded keys in memory and builds public URLs.
    """

    def __init__(self) -> None:
        """
        Start with no stored object.
        """
        self.keys: list[str] = []

    def upload_object(self, key: str, content: Any, content_type: str, is_private: bool) -> None:
        """
        Remember an uploaded key.

        Args:
            key (str): Object key.
            content (Any): File content.
            content_type (str): MIME type.
            is_private (bool): Bucket visibility.
        """
        self.keys.append(key)

    def build_public_url(self, key: str) -> str:
        """
        Build a public URL for a key.

        Args:
            key (str): Object key.

        Returns:
            str: Fake public URL.
        """
        return f"https://storage.test/public/{key}"


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


def test_a_season_banner_is_stored_in_the_public_bucket(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    Uploading the dusk banner stores it under the Season's code and returns its public URL.
    """
    season = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990305", is_owner=True)

    body = client.put(f"{API_URL}/{season.id}/illustration", params={"variant": "dark"}, files={"file": ("dusk.webp", b"RIFF0000WEBP", "image/webp")}, headers=build_auth_header(owner)).json()

    assert storage.keys[0].startswith(f"seasons/{season.code}/dark-")
    assert body["illustrationDarkUrl"] == f"https://storage.test/public/{storage.keys[0]}"
    assert body["illustrationUrl"] is None


def test_a_banner_must_be_an_image(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    Anything but WebP, PNG or JPEG is refused before reaching storage.
    """
    season = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990306", is_owner=True)

    response = client.put(f"{API_URL}/{season.id}/illustration", files={"file": ("notes.txt", b"hello", "text/plain")}, headers=build_auth_header(owner))

    assert response.json() == {"code": "unsupported_type"}
    assert storage.keys == []
