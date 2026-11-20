from types import SimpleNamespace
from typing import cast

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from core.config import Settings
from core.exceptions import SeedRefusedError
from modules.user.models.user_models import User
from seeds.services.owner_seed_services import OwnerSeedService


OWNER_EMAIL = "first.owner@oleoziza.test"

SEEDED_PASSWORD = "Seeded2026"

NEW_PASSWORD = "Chosen2026"


def build_owner_seed(db: Session, email: str = OWNER_EMAIL, password: str = SEEDED_PASSWORD) -> OwnerSeedService:
    """
    Build the Owner seed with SEED_OWNER_* settings of its own.

    Args:
        db (Session): Test session.
        email (str): SEED_OWNER_EMAIL, empty to leave it unset.
        password (str): SEED_OWNER_PASSWORD, empty to leave it unset.

    Returns:
        OwnerSeedService: Seed ready to run.
    """
    settings = SimpleNamespace(SEED_OWNER_EMAIL=email, SEED_OWNER_PASSWORD=password, SEED_OWNER_FIRST_NAME="Aziza", SEED_OWNER_LAST_NAME="Figuigui")
    return OwnerSeedService(db, cast(Settings, settings))


def remove_existing_owners(db: Session) -> None:
    """
    Make the rolled-back test database look like a fresh production one, where no Owner exists yet.

    Args:
        db (Session): Test session.
    """
    db.execute(update(User).where(User.is_owner.is_(True)).values(is_owner=False))
    db.flush()


def log_in(client: TestClient, password: str) -> dict:
    """
    Log in as the seeded Owner by email and password.

    Args:
        client (TestClient): API client.
        password (str): Password to try.

    Returns:
        dict: Status code and body of the login answer.
    """
    response = client.post("/api/auth/login", json={"identifier": OWNER_EMAIL, "method": "email_password", "secret": password})
    return {"status": response.status_code, "body": response.json()}


def test_the_seeded_owner_must_replace_the_seeded_password(client: TestClient, db: Session) -> None:
    """
    The password from backend.env only opens the forced change; afterwards only the Owner's own password works.
    """
    remove_existing_owners(db)
    assert build_owner_seed(db).run() is True

    first_login = log_in(client, SEEDED_PASSWORD)
    assert first_login["body"]["mustChangeCredential"] is True
    assert first_login["body"]["canSkipCredentialChange"] is False

    headers = {"Authorization": f"Bearer {first_login['body']['accessToken']}"}
    assert client.put("/api/auth/credential", json={"kind": "password", "secret": NEW_PASSWORD}, headers=headers).status_code == 204

    assert log_in(client, SEEDED_PASSWORD)["status"] == 401
    second_login = log_in(client, NEW_PASSWORD)
    assert second_login["status"] == 200
    assert second_login["body"]["mustChangeCredential"] is False


def test_once_an_owner_exists_the_settings_may_be_emptied(db: Session) -> None:
    """
    After the first start, SEED_OWNER_PASSWORD is deleted from backend.env; later starts keep the Owner and refuse nothing.
    """
    remove_existing_owners(db)
    build_owner_seed(db).run()

    assert build_owner_seed(db, email="", password="").run() is False
    assert db.scalars(select(User.email).where(User.is_owner.is_(True))).all() == [OWNER_EMAIL]


def test_without_an_owner_the_settings_are_required(db: Session) -> None:
    """
    A fresh database with SEED_OWNER_* left empty is refused rather than left without an Owner.
    """
    remove_existing_owners(db)

    with pytest.raises(SeedRefusedError) as error:
        build_owner_seed(db, password="").run()

    assert error.value.code == "owner_settings_missing"
