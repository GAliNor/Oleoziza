from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.audit.models.audit_models import AuditEvent
from modules.user.types.user_types import Permission
from tests.factories import TEST_PROVINCE_ID, build_auth_header, create_site, create_staff_user


API_URL = "/api/site/sites"


def build_site_body(code: str = "ZQ") -> dict[str, object]:
    """
    Build the body of a new Site in the test Province.

    Args:
        code (str): Two-letter code.

    Returns:
        dict[str, object]: Request body.
    """
    return {"code": code, "name": "Huilerie Test", "location": {"province": TEST_PROVINCE_ID, "city": "Oujda", "address": "Route de Taza"}, "phone": "0536000000"}


def test_staff_list_only_the_sites_they_hold(client: TestClient, db: Session) -> None:
    """
    A staff User sees the Sites they are assigned to; the Owner sees every one.
    """
    site = create_site(db)
    create_site(db, "TO")
    operator = create_staff_user(db, "+212669990501", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]})
    db.commit()

    body = client.get(API_URL, headers=build_auth_header(operator, {site.id: [Permission.RECEPTION_CREATE]})).json()

    assert [item["code"] for item in body] == ["TS"]


def test_the_owner_opens_a_site_and_its_creation_is_audited(client: TestClient, db: Session) -> None:
    """
    The Owner creates a Site with its code and Location; the Audit Trail records it.
    """
    create_site(db)
    owner = create_staff_user(db, "+212669990502", is_owner=True)
    db.commit()

    response = client.post(API_URL, json=build_site_body(), headers=build_auth_header(owner))
    event = db.scalar(select(AuditEvent).where(AuditEvent.action == "site.created", AuditEvent.actor_id == owner.id))

    assert response.status_code == 201
    assert response.json()["code"] == "ZQ"
    assert response.json()["province"] == TEST_PROVINCE_ID
    assert event is not None


def test_a_code_is_two_capital_letters_never_used_twice(client: TestClient, db: Session) -> None:
    """
    A taken code is refused, and a malformed one fails validation.
    """
    create_site(db)
    owner = create_staff_user(db, "+212669990503", is_owner=True)
    db.commit()

    taken = client.post(API_URL, json=build_site_body("TS"), headers=build_auth_header(owner))
    malformed = client.post(API_URL, json=build_site_body("oujda"), headers=build_auth_header(owner))

    assert taken.json() == {"code": "code_taken"}
    assert malformed.json() == {"code": "invalid_request", "fields": ["code"]}


def test_only_the_owner_opens_a_site(client: TestClient, db: Session) -> None:
    """
    Management with site.manage edits their Site but cannot open a new one.
    """
    site = create_site(db)
    manager = create_staff_user(db, "+212669990504", permissions_by_site={site.id: [Permission.SITE_MANAGE]})
    db.commit()
    headers = build_auth_header(manager, {site.id: [Permission.SITE_MANAGE]})

    created = client.post(API_URL, json=build_site_body(), headers=headers)
    updated = client.put(f"{API_URL}/{site.id}", json={"name": "Huilerie Renommée", "location": {"province": TEST_PROVINCE_ID, "city": "Oujda", "address": "Centre"}}, headers=headers)

    assert created.json() == {"code": "sites_forbidden"}
    assert updated.json()["name"] == "Huilerie Renommée"
    assert updated.json()["code"] == "TS"


def test_a_site_with_records_stays_and_an_empty_one_goes(client: TestClient, db: Session) -> None:
    """
    A Site anyone is assigned to is refused deletion; a fresh one is removed.
    """
    site = create_site(db)
    create_staff_user(db, "+212669990505", permissions_by_site={site.id: [Permission.RECEPTION_CREATE]})
    owner = create_staff_user(db, "+212669990506", is_owner=True)
    db.commit()
    headers = build_auth_header(owner)
    fresh_id = client.post(API_URL, json=build_site_body(), headers=headers).json()["id"]

    refused = client.delete(f"{API_URL}/{site.id}", headers=headers)
    removed = client.delete(f"{API_URL}/{fresh_id}", headers=headers)

    assert refused.json() == {"code": "site_has_records"}
    assert removed.status_code == 204
