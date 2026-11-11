import uuid
from datetime import datetime, timezone

import jwt
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey

from core.security import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE, TOKEN_ALGORITHM
from modules.user.models.user_models import User


def build_access_token(user: User, permissions_by_site: dict[str, list[str]], signing_key: EllipticCurvePrivateKey, expiry_in_seconds: int, now: datetime | None = None) -> str:
    """
    Sign a short-lived access token with what the front needs to guard screens offline: Role, Owner flag, Permissions per Site and names.

    Args:
        user (User): Signed-in User.
        permissions_by_site (dict[str, list[str]]): Permission keys per Site id.
        signing_key (EllipticCurvePrivateKey): ES256 private key.
        expiry_in_seconds (int): Lifetime of the token.
        now (datetime | None): Issue time, the current time when omitted.

    Returns:
        str: Compact ES256 JWT.
    """
    issued_at = int((now or datetime.now(timezone.utc)).timestamp())
    claims = {
        "sub": str(user.id),
        "type": ACCESS_TOKEN_TYPE,
        "iat": issued_at,
        "exp": issued_at + expiry_in_seconds,
        "jti": uuid.uuid4().hex,
        "role": user.role.value,
        "isOwner": user.is_owner,
        "sites": permissions_by_site,
        "firstName": user.first_name,
        "lastName": user.last_name,
    }
    if user.title is not None:
        claims["title"] = user.title.value
    return jwt.encode(claims, signing_key, algorithm=TOKEN_ALGORITHM)


def build_refresh_token(user: User, signing_key: EllipticCurvePrivateKey, expiry_in_seconds: int, now: datetime | None = None) -> str:
    """
    Sign a refresh token bound to the User's token_version, so bumping the version revokes it.

    Args:
        user (User): Signed-in User.
        signing_key (EllipticCurvePrivateKey): ES256 private key.
        expiry_in_seconds (int): Lifetime of the token.
        now (datetime | None): Issue time, the current time when omitted.

    Returns:
        str: Compact ES256 JWT.
    """
    issued_at = int((now or datetime.now(timezone.utc)).timestamp())
    claims = {
        "sub": str(user.id),
        "type": REFRESH_TOKEN_TYPE,
        "iat": issued_at,
        "exp": issued_at + expiry_in_seconds,
        "jti": uuid.uuid4().hex,
        "tv": user.token_version,
    }
    return jwt.encode(claims, signing_key, algorithm=TOKEN_ALGORITHM)
