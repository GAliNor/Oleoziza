from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_site, create_staff_user


API_URL = "/api/configuration/notification-channels"


def test_every_channel_starts_off_and_only_email_can_be_switched_on(client: TestClient, db: Session) -> None:
    """
    After deploy no channel is on; WhatsApp and SMS are not implemented yet and refuse to be switched on.
    """
    site = create_site(db)
    owner = create_staff_user(db, "+212669992001", is_owner=True)
    db.commit()
    headers = build_auth_header(owner, {site.id: list(Permission)})

    before = client.get(API_URL, headers=headers).json()
    whatsapp = client.put(f"{API_URL}/whatsapp", json={"isEnabled": True}, headers=headers)
    email = client.put(f"{API_URL}/email", json={"isEnabled": True}, headers=headers).json()

    assert before == [
        {"channel": "whatsapp", "isImplemented": False, "isEnabled": False},
        {"channel": "sms", "isImplemented": False, "isEnabled": False},
        {"channel": "email", "isImplemented": True, "isEnabled": False},
    ]
    assert (whatsapp.status_code, whatsapp.json()) == (409, {"code": "notification_channel_not_implemented"})
    assert email[2] == {"channel": "email", "isImplemented": True, "isEnabled": True}


def test_a_manager_of_one_site_cannot_switch_the_company_channels(client: TestClient, db: Session) -> None:
    """
    The channels hold for every Site, so the right on one Site alone is not enough; an Operator may still read them for Reception.
    """
    first = create_site(db, "T1")
    create_site(db, "T2")
    manager = create_staff_user(db, "+212669992002", permissions_by_site={first.id: [Permission.CONFIGURATION_MANAGE]})
    db.commit()
    headers = build_auth_header(manager, {first.id: [Permission.CONFIGURATION_MANAGE]})

    refused = client.put(f"{API_URL}/email", json={"isEnabled": True}, headers=headers)
    read = client.get(API_URL, headers=headers)

    assert (refused.status_code, refused.json()) == (403, {"code": "configuration_forbidden"})
    assert read.status_code == 200
