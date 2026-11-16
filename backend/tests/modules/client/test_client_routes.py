from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from modules.audit.models.audit_models import AuditEvent
from modules.client.models.client_models import Client
from modules.user.types.user_types import Permission
from tests.factories import TEST_PROVINCE_ID, build_auth_header, create_site, create_staff_user


API_URL = "/api/client/clients"


def build_client_body(site_id: UUID, client_id: UUID, **overrides: object) -> dict[str, object]:
    """
    Build the body of a new individual Client.

    Args:
        site_id (UUID): Site where the Client is created.
        client_id (UUID): Id minted by the front.
        **overrides (object): Fields to change.

    Returns:
        dict[str, object]: Request body.
    """
    body: dict[str, object] = {
        "id": str(client_id),
        "kind": "individual",
        "firstName": "Nadia",
        "lastName": "Rahmani",
        "phone": "+212661223344",
        "siteId": str(site_id),
        "identifier": "ab123456",
        "location": {"province": TEST_PROVINCE_ID, "city": "Oujda", "address": "Hay Essalam"},
    }
    return {**body, **overrides}


def test_an_operator_creates_a_client_once_even_when_the_outbox_replays_it(client: TestClient, db: Session) -> None:
    """
    An Operator receiving olives creates a Client; the outbox replaying the same id gives back the same Client, audited once.
    """
    site = create_site(db)
    operator = create_staff_user(db, "+212669990601", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]})
    db.commit()
    headers = build_auth_header(operator, {site.id: [Permission.RECEPTION_CREATE]})
    client_id = uuid7()

    first = client.post(API_URL, json=build_client_body(site.id, client_id), headers=headers).json()
    replay = client.post(API_URL, json=build_client_body(site.id, client_id), headers=headers).json()
    events = db.scalar(select(func.count()).select_from(AuditEvent).where(AuditEvent.entity_id == client_id))

    assert first == replay
    assert first["name"] == "Nadia Rahmani"
    assert first["identifier"] == "AB123456"
    assert first["siteIds"] == [str(site.id)]
    assert events == 1


def test_an_individual_needs_both_names_and_a_valid_cin(client: TestClient, db: Session) -> None:
    """
    An Individual without a last name, or with a malformed CIN, is refused.
    """
    site = create_site(db)
    operator = create_staff_user(db, "+212669990602", permissions_by_site={site.id: [Permission.CLIENT_CREATE]})
    db.commit()
    headers = build_auth_header(operator, {site.id: [Permission.CLIENT_CREATE]})

    no_last_name = client.post(API_URL, json=build_client_body(site.id, uuid7(), lastName=None), headers=headers)
    bad_cin = client.post(API_URL, json=build_client_body(site.id, uuid7(), identifier="12345"), headers=headers)

    assert no_last_name.json() == {"code": "names_required"}
    assert bad_cin.json() == {"code": "identifier_invalid"}


def test_creating_needs_a_right_on_the_site(client: TestClient, db: Session) -> None:
    """
    Staff without client.create or reception.create on the Site are refused.
    """
    site = create_site(db)
    accountant = create_staff_user(db, "+212669990603", permissions_by_site={site.id: [Permission.FINANCE_VIEW]})
    db.commit()

    response = client.post(API_URL, json=build_client_body(site.id, uuid7()), headers=build_auth_header(accountant, {site.id: [Permission.FINANCE_VIEW]}))

    assert response.json() == {"code": "clients_forbidden"}


def test_the_register_shows_new_clients_as_inactive_with_their_site(client: TestClient, db: Session) -> None:
    """
    A Client who brought nothing this Season reads inactive, on the Site where they were created.
    """
    site = create_site(db)
    manager = create_staff_user(db, "+212669990604", permissions_by_site={site.id: [Permission.CLIENT_VIEW, Permission.CLIENT_CREATE]})
    db.commit()
    headers = build_auth_header(manager, {site.id: [Permission.CLIENT_VIEW, Permission.CLIENT_CREATE]})
    client_id = uuid7()
    client.post(API_URL, json=build_client_body(site.id, client_id), headers=headers)

    record = next(item for item in client.get(f"{API_URL}/records", headers=headers).json() if item["id"] == str(client_id))

    assert record["followUp"] == "inactive"
    assert [item["siteId"] for item in record["sites"]] == [str(site.id)]
    assert record["history"] == []


def test_a_contact_change_is_audited(client: TestClient, db: Session) -> None:
    """
    Changing a Client's phone keeps the old one in the Audit Trail.
    """
    site = create_site(db)
    manager = create_staff_user(db, "+212669990605", permissions_by_site={site.id: [Permission.CLIENT_EDIT, Permission.CLIENT_CREATE]})
    db.commit()
    headers = build_auth_header(manager, {site.id: [Permission.CLIENT_EDIT, Permission.CLIENT_CREATE]})
    client_id = uuid7()
    client.post(API_URL, json=build_client_body(site.id, client_id), headers=headers)

    updated = client.patch(f"{API_URL}/{client_id}/contact", json={"phone": "+212661999999"}, headers=headers).json()
    event = db.scalar(select(AuditEvent).where(AuditEvent.entity_id == client_id, AuditEvent.action == "client.contact_changed"))

    assert updated["phone"] == "+212661999999"
    assert event is not None and event.before == {"phone": "+212661223344", "email": None}
    assert db.get(Client, client_id) is not None
