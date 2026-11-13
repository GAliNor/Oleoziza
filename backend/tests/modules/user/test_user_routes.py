from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from modules.auth.models.auth_models import Invitation
from modules.auth.services.invitation_services import InvitationService
from modules.user.models.user_models import User
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_site, create_staff_user


API_URL = "/api/user"


@pytest.fixture
def published(monkeypatch: pytest.MonkeyPatch) -> list[tuple[Any, ...]]:
    """
    Capture the tasks the user service publishes instead of sending them to the broker.

    Args:
        monkeypatch (pytest.MonkeyPatch): Patcher.

    Returns:
        list[tuple[Any, ...]]: Published task arguments.
    """
    calls: list[tuple[Any, ...]] = []
    monkeypatch.setattr("modules.user.services.user_services.publish_task", lambda task, *args: calls.append(args) or True)
    return calls


def build_operator_form(site_id: str, phone: str = "0669990201", **overrides: Any) -> dict[str, Any]:
    """
    Build the form the Users page sends to create an Operator.

    Args:
        site_id (str): Site given.
        phone (str): Phone as typed.
        **overrides (Any): Fields to change.

    Returns:
        dict[str, Any]: Request body.
    """
    form = {
        "role": "operator",
        "firstName": "Hamid",
        "lastName": "Zerrouki",
        "phone": phone,
        "location": {"province": "oujda-angad", "city": "Oujda", "address": "Hay Al Andalous"},
        "sites": {site_id: ["reception.create"]},
        "isInvited": False,
        "firstSecret": "1111",
    }
    return {**form, **overrides}


def test_management_creates_an_operator_with_a_first_pin(client: TestClient, db: Session, published: list) -> None:
    """
    An Operator created with a first PIN is active, logs in by phone and PIN, and must change it at first login.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990200", is_owner=True)

    response = client.post(API_URL, json=build_operator_form(str(site.id)), headers=build_auth_header(owner))
    created = db.get(User, response.json()["id"])

    assert response.status_code == 201
    assert response.json()["status"] == "active"
    assert response.json()["loginMethods"] == ["phone_pin"]
    assert created.must_change_credential is True
    assert published == []


def test_an_operator_is_created_without_a_location(client: TestClient, db: Session, published: list) -> None:
    """
    Province, city and address are left for later, so creating an Operator stays quick.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990220", is_owner=True)

    response = client.post(API_URL, json=build_operator_form(str(site.id), "0669990221", location=None), headers=build_auth_header(owner))

    assert response.status_code == 201
    assert response.json()["location"] is None


def test_an_invited_user_receives_a_link_that_activates_them(client: TestClient, db: Session, published: list) -> None:
    """
    Inviting publishes the sending to the worker; accepting the link sets the chosen secret and activates the User.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990210", is_owner=True)
    body = client.post(API_URL, json=build_operator_form(str(site.id), "0669990211", isInvited=True, firstSecret=None), headers=build_auth_header(owner)).json()
    invitation_id, token = published[0]

    invitation = InvitationService(db).get_invitation(token)
    accepted = client.post(f"/api/auth/invitations/{token}/accept", json={"secret": "4826"})

    assert body["status"] == "invited"
    assert db.get(Invitation, invitation_id).sent_to == "+212669990211"
    assert invitation.credential_kind == "pin"
    assert accepted.status_code == 200
    assert db.get(User, body["id"]).status == "active"


def test_a_contact_already_used_is_refused(client: TestClient, db: Session, published: list) -> None:
    """
    Two Users cannot share a phone.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990220", is_owner=True)

    response = client.post(API_URL, json=build_operator_form(str(site.id), "0669990220"), headers=build_auth_header(owner))

    assert response.json() == {"code": "identifier_taken"}


def test_a_manager_cannot_grant_a_permission_they_lack(client: TestClient, db: Session, published: list) -> None:
    """
    A manager holding user.manage but not finance.view cannot give finance.view.
    """
    site = create_site(db)
    rights = {site.id: [Permission.USER_MANAGE, Permission.RECEPTION_CREATE]}
    manager = create_staff_user(db, "+212669990230", permissions_by_site=rights)

    response = client.post(API_URL, json=build_operator_form(str(site.id), sites={str(site.id): ["finance.view"]}), headers=build_auth_header(manager, rights))

    assert response.json() == {"code": "permission_not_held"}


def test_staff_without_user_manage_cannot_list_users(client: TestClient, db: Session) -> None:
    """
    The Users page is closed to staff without user.manage anywhere.
    """
    site = create_site(db)
    rights = {site.id: [Permission.RECEPTION_CREATE]}
    operator = create_staff_user(db, "+212669990240", permissions_by_site=rights)

    response = client.get(API_URL, headers=build_auth_header(operator, rights))

    assert response.json() == {"code": "users_forbidden"}


def test_the_owner_and_oneself_cannot_be_changed(client: TestClient, db: Session) -> None:
    """
    Nobody changes the Owner's account, and a manager does not change their own.
    """
    site = create_site(db)
    rights = {site.id: [Permission.USER_MANAGE]}
    owner = create_staff_user(db, "+212669990250", is_owner=True, permissions_by_site=rights)
    manager = create_staff_user(db, "+212669990251", permissions_by_site=rights)
    headers = build_auth_header(manager, rights)

    on_owner = client.put(f"{API_URL}/{owner.id}/status", json={"status": "disabled"}, headers=headers)
    on_self = client.put(f"{API_URL}/{manager.id}/status", json={"status": "disabled"}, headers=headers)

    assert on_owner.json() == {"code": "user_locked"}
    assert on_self.json() == {"code": "user_locked"}


def test_a_user_keeps_at_least_one_site(client: TestClient, db: Session) -> None:
    """
    Removing a User's only Site is refused.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990260", is_owner=True)
    operator = create_staff_user(db, "+212669990261", role="operator", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]})

    response = client.delete(f"{API_URL}/{operator.id}/sites/{site.id}", headers=build_auth_header(owner))

    assert response.json() == {"code": "last_site"}


def test_disabling_a_user_cuts_their_next_refresh(client: TestClient, db: Session) -> None:
    """
    A disabled User's refresh token stops working, since disabling bumps their token version.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669990270", is_owner=True)
    manager = create_staff_user(db, "+212669990271", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]}, password="Moulin2026", email="test.disable@oleoziza.ma")
    client.post("/api/auth/login", json={"identifier": "test.disable@oleoziza.ma", "method": "email_password", "secret": "Moulin2026"})

    client.put(f"{API_URL}/{manager.id}/status", json={"status": "disabled"}, headers=build_auth_header(owner))
    response = client.post("/api/auth/refresh", json={"userId": str(manager.id)})

    assert response.json() == {"code": "session_expired"}
