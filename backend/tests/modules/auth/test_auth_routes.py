import json

import jwt
from fastapi.testclient import TestClient
from jwt.algorithms import ECAlgorithm
from sqlalchemy.orm import Session

from core.config import get_settings
from core.security import get_signing_key
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.business.auth_tokens import build_refresh_token
from modules.auth.helpers.auth_cookies import build_refresh_cookie_name
from modules.auth.models.auth_models import Credential
from modules.auth.types.auth_types import CredentialKind
from modules.user.models.user_models import User, UserLoginMethod
from modules.user.types.user_types import LoginMethod, Role, UserStatus


PASSWORD = "Moulin2026"

PIN = "4321"

PHONE = "+212669990001"

EMAIL = "test.auth@oleoziza.ma"

API_URL = "/api/auth"


def create_user(db: Session, role: Role = Role.OPERATOR, status: UserStatus = UserStatus.ACTIVE) -> User:
    """
    Add a User who may log in by phone and PIN or by email and password.

    Args:
        db (Session): Test session.
        role (Role): Role of the User.
        status (UserStatus): Account status.

    Returns:
        User: The saved User.
    """
    user = User(role=role, first_name="Test", last_name="Auth", phone=PHONE, email=EMAIL, status=status)
    db.add(user)
    db.flush()
    db.add_all(
        [
            UserLoginMethod(user_id=user.id, method=LoginMethod.PHONE_PIN),
            UserLoginMethod(user_id=user.id, method=LoginMethod.EMAIL_PASSWORD),
            Credential(user_id=user.id, kind=CredentialKind.PIN, hash=hash_secret(PIN)),
            Credential(user_id=user.id, kind=CredentialKind.PASSWORD, hash=hash_secret(PASSWORD)),
        ]
    )
    db.commit()
    return user


def log_in(client: TestClient, identifier: str = "0669990001", method: str = "phone_pin", secret: str = PIN) -> dict:
    """
    Call the login route and return its response body.

    Args:
        client (TestClient): Test client.
        identifier (str): Phone or email as typed.
        method (str): Login Method.
        secret (str): PIN or password.

    Returns:
        dict: Response JSON.
    """
    return client.post(f"{API_URL}/login", json={"identifier": identifier, "method": method, "secret": secret}).json()


def test_login_options_normalize_the_phone_and_list_matching_methods(client: TestClient, db: Session) -> None:
    """
    A phone typed the Moroccan way is normalized, and only phone methods with a stored secret are offered.
    """
    create_user(db)

    response = client.post(f"{API_URL}/login-options", json={"identifier": "06 69 99 00 01"})

    assert response.json() == {"identifier": PHONE, "loginMethods": ["phone_pin"]}


def test_login_issues_a_token_the_front_key_verifies_and_a_per_user_cookie(client: TestClient, db: Session) -> None:
    """
    The access token verifies with the public key the front holds, carries the Role, and the refresh cookie is named after the User.
    """
    user = create_user(db)
    front_public_key = ECAlgorithm.from_jwk(json.dumps({key: value for key, value in json.loads(get_settings().AUTH_PRIVATE_JWK).items() if key != "d"}))

    body = log_in(client)
    claims = jwt.decode(body["accessToken"], front_public_key, algorithms=["ES256"])

    assert claims["sub"] == str(user.id)
    assert claims["role"] == "operator"
    assert body["credentialKind"] == "pin"
    assert client.cookies.get(build_refresh_cookie_name(user.id)) is not None


def test_five_wrong_secrets_lock_the_account(client: TestClient, db: Session) -> None:
    """
    The fifth wrong PIN in a row locks the account and says until when.
    """
    create_user(db)

    responses = [client.post(f"{API_URL}/login", json={"identifier": PHONE, "method": "phone_pin", "secret": "0000"}) for _ in range(5)]

    assert [response.status_code for response in responses] == [401, 401, 401, 401, 423]
    assert responses[-1].json()["code"] == "locked"
    assert "lockedUntil" in responses[-1].json()


def test_password_cannot_be_used_with_a_phone(client: TestClient, db: Session) -> None:
    """
    A Login Method that does not match the identifier is refused.
    """
    create_user(db)

    body = log_in(client, method="email_password", secret=PASSWORD)

    assert body == {"code": "method_not_allowed"}


def test_refresh_rotates_the_cookie_and_refuses_another_user(client: TestClient, db: Session) -> None:
    """
    A refresh answers a new access token for the cookie's owner, and refuses a User id the cookie does not belong to.
    """
    user = create_user(db)
    log_in(client)

    own_refresh = client.post(f"{API_URL}/refresh", json={"userId": str(user.id)})
    other_refresh = client.post(f"{API_URL}/refresh", json={"userId": "00000000-0000-7000-8000-000000000000"})

    assert own_refresh.status_code == 200
    assert "accessToken" in own_refresh.json()
    assert other_refresh.json() == {"code": "session_expired"}


def test_changing_the_credential_revokes_older_refresh_tokens(client: TestClient, db: Session) -> None:
    """
    After a credential change, a refresh token issued before it is refused, while the current device keeps a fresh cookie.
    """
    user = create_user(db)
    access_token = log_in(client)["accessToken"]
    old_refresh_token = build_refresh_token(user, get_signing_key(), 60)

    change = client.put(f"{API_URL}/credential", json={"kind": "pin", "secret": "8765", "currentSecret": PIN}, headers={"Authorization": f"Bearer {access_token}"})
    current_device = client.post(f"{API_URL}/refresh", json={"userId": str(user.id)})
    client.cookies.set(build_refresh_cookie_name(user.id), old_refresh_token)
    other_device = client.post(f"{API_URL}/refresh", json={"userId": str(user.id)})

    assert change.status_code == 204
    assert current_device.status_code == 200
    assert other_device.json() == {"code": "session_expired"}


def test_disabled_user_cannot_refresh(client: TestClient, db: Session) -> None:
    """
    A User disabled after logging in is refused at the next refresh.
    """
    user = create_user(db)
    log_in(client)
    user.status = UserStatus.DISABLED
    db.commit()

    response = client.post(f"{API_URL}/refresh", json={"userId": str(user.id)})

    assert response.status_code == 403
    assert response.json() == {"code": "disabled"}


def test_logout_removes_the_cookie(client: TestClient, db: Session) -> None:
    """
    After logout, the device holds no refresh cookie for the User and a refresh is refused.
    """
    user = create_user(db)
    log_in(client)

    client.post(f"{API_URL}/logout", json={"userId": str(user.id)})
    response = client.post(f"{API_URL}/refresh", json={"userId": str(user.id)})

    assert client.cookies.get(build_refresh_cookie_name(user.id)) is None
    assert response.json() == {"code": "session_expired"}


def test_only_a_client_may_skip_the_credential_change(client: TestClient, db: Session) -> None:
    """
    Staff must change a first secret set by Management; a Client may skip it.
    """
    create_user(db)
    access_token = log_in(client)["accessToken"]

    response = client.post(f"{API_URL}/credential/skip", headers={"Authorization": f"Bearer {access_token}"})

    assert response.json() == {"code": "method_not_allowed"}


def test_a_refresh_token_is_not_accepted_as_an_access_token(client: TestClient, db: Session) -> None:
    """
    Routes guarded by the access token refuse a refresh token, even though both are signed by the same key.
    """
    user = create_user(db)
    log_in(client)
    refresh_token = client.cookies.get(build_refresh_cookie_name(user.id))

    response = client.post(f"{API_URL}/credential/skip", headers={"Authorization": f"Bearer {refresh_token}"})

    assert response.json() == {"code": "session_expired"}


def test_a_voluntary_change_needs_the_current_secret(client: TestClient, db: Session) -> None:
    """
    Outside a forced change, a new secret is refused without a correct current one.
    """
    create_user(db)
    access_token = log_in(client)["accessToken"]
    headers = {"Authorization": f"Bearer {access_token}"}

    missing = client.put(f"{API_URL}/credential", json={"kind": "password", "secret": "Nouveau2026"}, headers=headers)
    wrong = client.put(f"{API_URL}/credential", json={"kind": "password", "secret": "Nouveau2026", "currentSecret": "0000"}, headers=headers)
    right = client.put(f"{API_URL}/credential", json={"kind": "password", "secret": "Nouveau2026", "currentSecret": PIN}, headers=headers)

    assert missing.json() == {"code": "invalid_credential"}
    assert wrong.json() == {"code": "invalid_credential"}
    assert right.status_code == 204


def test_a_forced_change_needs_no_current_secret(client: TestClient, db: Session) -> None:
    """
    A User whose first secret was set by Management changes it without typing it again.
    """
    user = create_user(db)
    user.must_change_credential = True
    db.commit()
    access_token = log_in(client)["accessToken"]

    response = client.put(f"{API_URL}/credential", json={"kind": "pin", "secret": "8765"}, headers={"Authorization": f"Bearer {access_token}"})

    assert response.status_code == 204
