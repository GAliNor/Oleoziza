from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from uuid import uuid4
from typing import Any

import pytest

from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session

from core.helpers import get_local_midnight
from core.integrations.rustfs.rustfs_client import get_rustfs_client
from main import app
from modules.configuration.models.configuration_models import SiteSetting
from modules.configuration.types.configuration_types import SettingKey
from modules.file.models.file_models import File
from modules.file.types.file_types import FileBucket
from modules.site.models.site_models import Season, SeasonIllustration
from modules.site.types.site_types import SeasonStatus
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
    latest_start = db.scalar(select(func.max(Season.starts_on)))

    body = client.post(API_URL, headers=build_auth_header(owner)).json()
    carried = db.scalar(select(SiteSetting.value).where(SiteSetting.season_id == body["id"], SiteSetting.site_id == site.id, SiteSetting.key == SettingKey.MILLING_RATE_PER_KG))

    assert body["status"] == "planned"
    assert body["startsOn"] == f"{latest_start.year + 1}-11-01"
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


def test_an_uploaded_banner_becomes_the_season_illustration_named_after_the_season(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    The first picture uploaded serves both versions until the other one is uploaded; the Season uses that Season Illustration.
    """
    season = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990305", is_owner=True)
    upload_url = f"{API_URL}/{season.id}/illustration"

    first = client.put(upload_url, params={"variant": "dark"}, files={"file": ("dusk.webp", b"RIFF0000WEBP", "image/webp")}, headers=build_auth_header(owner)).json()
    second = client.put(upload_url, params={"variant": "light"}, files={"file": ("day.webp", b"RIFF0000WEBP", "image/webp")}, headers=build_auth_header(owner)).json()

    dusk_url, day_url = (f"https://storage.test/public/{key}" for key in storage.keys)
    assert storage.keys[0].startswith(f"seasons/{season.code}/dark-")
    assert (first["illustrationUrl"], first["illustrationDarkUrl"]) == (dusk_url, dusk_url)
    assert (second["illustrationUrl"], second["illustrationDarkUrl"]) == (day_url, dusk_url)
    assert second["seasonIllustrationId"] == str(db.scalar(select(SeasonIllustration.id).where(SeasonIllustration.code == season.code)))


def test_a_banner_must_be_an_image(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    Anything but WebP, PNG or JPEG is refused before reaching storage.
    """
    season = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990306", is_owner=True)

    response = client.put(f"{API_URL}/{season.id}/illustration", files={"file": ("notes.txt", b"hello", "text/plain")}, headers=build_auth_header(owner))

    assert response.json() == {"code": "unsupported_type"}
    assert storage.keys == []


@pytest.mark.parametrize("season_count", [1, 10])
def test_season_banners_are_read_in_one_query(client: TestClient, db: Session, storage: FakeStorage, season_count: int) -> None:
    """
    A cold Season list reads all banners together and preserves public URLs, missing art and chronological order.
    """
    blank_season = open_fresh_season(db)
    blank_id = str(blank_season.id)
    owner = create_staff_user(db, "+212669990307", is_owner=True)
    headers = build_auth_header(owner)
    expected_urls: dict[str, tuple[str, str]] = {}
    for number in range(season_count):
        year = 1990 + number
        light, dark = create_illustration_files(db)
        illustration = SeasonIllustration(code=f"test-{uuid4().hex[:8]}", light_file_id=light.id, dark_file_id=dark.id)
        db.add(illustration)
        db.flush()
        season = Season(code=f"{year % 100:02d}{(year + 1) % 100:02d}", label=f"Saison {year}", starts_on=date(year, 11, 1), status=SeasonStatus.CLOSED, season_illustration_id=illustration.id)
        db.add(season)
        db.flush()
        expected_urls[str(season.id)] = (storage.build_public_url(light.storage_key), storage.build_public_url(dark.storage_key))
    db.commit()
    db.expunge_all()
    statements: list[str] = []

    def record_query(connection: Any, cursor: Any, statement: str, parameters: Any, context: Any, executemany: bool) -> None:
        """
        Count reads during the request, excluding transaction control statements.
        """
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    connection = db.get_bind()
    event.listen(connection, "before_cursor_execute", record_query)
    try:
        response = client.get(API_URL, headers=headers)
    finally:
        event.remove(connection, "before_cursor_execute", record_query)

    assert response.status_code == 200
    assert len(statements) == 2
    body = response.json()
    assert [season["startsOn"] for season in body] == sorted(season["startsOn"] for season in body)
    by_id = {season["id"]: season for season in body}
    assert by_id[blank_id]["illustrationUrl"] is None
    assert by_id[blank_id]["illustrationDarkUrl"] is None
    for season_id, (light_url, dark_url) in expected_urls.items():
        assert by_id[season_id]["illustrationUrl"] == light_url
        assert by_id[season_id]["illustrationDarkUrl"] == dark_url


def create_illustration_files(db: Session) -> tuple[File, File]:
    """
    Record the daylight and dusk pictures of a test Season Illustration.

    Args:
        db (Session): Test session.

    Returns:
        tuple[File, File]: The daylight File and the dusk File, flushed.
    """
    light = File(bucket=FileBucket.PUBLIC, storage_key=f"tests/{uuid4()}/light.webp", original_name="light.webp", content_type="image/webp", size_in_bytes=1)
    dark = File(bucket=FileBucket.PUBLIC, storage_key=f"tests/{uuid4()}/dark.webp", original_name="dark.webp", content_type="image/webp", size_in_bytes=1)
    db.add_all([light, dark])
    db.flush()
    return light, dark


def create_season_illustration(db: Session) -> SeasonIllustration:
    """
    Add an available Season Illustration with its two pictures.

    Args:
        db (Session): Test session.

    Returns:
        SeasonIllustration: The flushed Season Illustration.
    """
    light, dark = create_illustration_files(db)
    illustration = SeasonIllustration(code=f"test-{uuid4().hex[:8]}", light_file_id=light.id, dark_file_id=dark.id)
    db.add(illustration)
    db.flush()
    return illustration


def test_the_available_season_illustrations_are_listed_with_both_pictures(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    The Season form's picker gets every Season Illustration with its daylight and dusk URLs.
    """
    illustration = create_season_illustration(db)
    owner = create_staff_user(db, "+212669990308", is_owner=True)

    body = client.get("/api/site/season-illustrations", headers=build_auth_header(owner)).json()

    listed = next(item for item in body if item["id"] == str(illustration.id))
    assert listed["code"] == illustration.code
    assert listed["illustrationUrl"].endswith("/light.webp")
    assert listed["illustrationDarkUrl"].endswith("/dark.webp")


def test_a_season_is_prepared_with_the_season_illustration_picked(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    Creating a Season with a picked Season Illustration shows its pictures on the new Season at once.
    """
    open_fresh_season(db)
    illustration = create_season_illustration(db)
    owner = create_staff_user(db, "+212669990309", is_owner=True)
    db.commit()

    body = client.post(API_URL, json={"seasonIllustrationId": str(illustration.id)}, headers=build_auth_header(owner)).json()

    assert body["status"] == "planned"
    assert body["seasonIllustrationId"] == str(illustration.id)
    assert body["illustrationUrl"].endswith("/light.webp")


def test_several_seasons_may_share_a_season_illustration_and_drop_it(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    Two Seasons pick the same Season Illustration; choosing none brings one back to the drawn sketch without touching the other.
    """
    current = open_fresh_season(db)
    past = Season(code="9797", label="Saison passée", starts_on=date(1997, 11, 1), status=SeasonStatus.CLOSED)
    db.add(past)
    illustration = create_season_illustration(db)
    owner = create_staff_user(db, "+212669990310", is_owner=True)
    db.commit()
    headers = build_auth_header(owner)

    for season in (current, past):
        client.put(f"{API_URL}/{season.id}/season-illustration", json={"seasonIllustrationId": str(illustration.id)}, headers=headers)
    dropped = client.put(f"{API_URL}/{current.id}/season-illustration", json={"seasonIllustrationId": None}, headers=headers).json()
    db.refresh(past)

    assert dropped["seasonIllustrationId"] is None
    assert dropped["illustrationUrl"] is None
    assert past.season_illustration_id == illustration.id


def test_picking_an_unknown_season_illustration_is_refused(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    An id that names no Season Illustration is refused, on creation as on change.
    """
    season = open_fresh_season(db)
    owner = create_staff_user(db, "+212669990311", is_owner=True)
    db.commit()
    unknown = {"seasonIllustrationId": str(uuid4())}

    on_change = client.put(f"{API_URL}/{season.id}/season-illustration", json=unknown, headers=build_auth_header(owner))
    on_creation = client.post(API_URL, json=unknown, headers=build_auth_header(owner))

    assert (on_change.status_code, on_change.json()) == (404, {"code": "season_illustration_not_found"})
    assert (on_creation.status_code, on_creation.json()) == (404, {"code": "season_illustration_not_found"})


def test_picking_a_season_illustration_needs_season_manage(client: TestClient, db: Session, storage: FakeStorage) -> None:
    """
    Staff without season.manage cannot change a Season's Season Illustration.
    """
    site = create_site(db)
    season = open_fresh_season(db)
    illustration = create_season_illustration(db)
    rights = {site.id: [Permission.CONFIGURATION_MANAGE]}
    manager = create_staff_user(db, "+212669990312", permissions_by_site=rights)

    response = client.put(f"{API_URL}/{season.id}/season-illustration", json={"seasonIllustrationId": str(illustration.id)}, headers=build_auth_header(manager, rights))

    assert response.json() == {"code": "season_forbidden"}
