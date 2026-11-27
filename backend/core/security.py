import json
from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey, EllipticCurvePublicKey
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import ECAlgorithm

from core.config import get_settings
from core.exceptions import AuthError, RefusedError
from core.types import CurrentUser


TOKEN_ALGORITHM = "ES256"

ACCESS_TOKEN_TYPE = "access"

REFRESH_TOKEN_TYPE = "refresh"

REQUIRED_CLAIMS = ["sub", "type", "iat", "exp", "jti"]

SESSION_EXPIRED_CODE = "session_expired"

MANAGEMENT_ROLE = "management"

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache
def get_signing_key() -> EllipticCurvePrivateKey:
    """
    Load once the ES256 private key that signs every token, from the AUTH_PRIVATE_JWK setting.

    Returns:
        EllipticCurvePrivateKey: P-256 private key.

    Raises:
        ValueError: If the setting does not hold a private EC JWK.
    """
    key = ECAlgorithm.from_jwk(json.loads(get_settings().AUTH_PRIVATE_JWK))
    if not isinstance(key, EllipticCurvePrivateKey):
        raise ValueError("AUTH_PRIVATE_JWK must be a private EC key (with its d member)")
    return key


@lru_cache
def get_verification_key() -> EllipticCurvePublicKey:
    """
    Derive once the public key that verifies tokens, the one the front also holds.

    Returns:
        EllipticCurvePublicKey: P-256 public key.
    """
    return get_signing_key().public_key()


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    """
    Verify a token's signature, expiry and type, and return its claims; no database lookup.

    Args:
        token (str): Compact JWT.
        expected_type (str): "access" or "refresh"; a token of the other type is refused.

    Returns:
        dict[str, Any]: Verified claims.

    Raises:
        AuthError: session_expired when the token is expired, forged, malformed or of the other type.
    """
    try:
        claims = jwt.decode(token, get_verification_key(), algorithms=[TOKEN_ALGORITHM], options={"require": REQUIRED_CLAIMS})
    except jwt.PyJWTError as error:
        raise AuthError(SESSION_EXPIRED_CODE) from error
    if claims["type"] != expected_type or not is_uuid(str(claims["sub"])):
        raise AuthError(SESSION_EXPIRED_CODE)
    return claims


def is_uuid(value: str) -> bool:
    """
    Tell whether a text is a UUID, as every User id is.

    Args:
        value (str): Text to check.

    Returns:
        bool: True for a valid UUID.
    """
    try:
        UUID(value)
    except ValueError:
        return False
    return True


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> CurrentUser:
    """
    Resolve the signed-in User from the Bearer access token by its signature alone.

    Args:
        credentials (HTTPAuthorizationCredentials | None): Bearer token from the Authorization header.

    Returns:
        CurrentUser: Id, Role, Owner flag and Permissions per Site carried by the token.

    Raises:
        AuthError: session_expired if the token is missing, invalid, expired or not an access token.
    """
    if credentials is None:
        raise AuthError(SESSION_EXPIRED_CODE)
    claims = decode_token(credentials.credentials, ACCESS_TOKEN_TYPE)
    return CurrentUser(id=UUID(claims["sub"]), role=claims["role"], is_owner=claims["isOwner"], permissions_by_site=claims.get("sites", {}))


def get_current_owner(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    Let only an Owner through, for settings no Permission can grant.

    Args:
        current_user (CurrentUser): The signed-in User.

    Returns:
        CurrentUser: The Owner.

    Raises:
        RefusedError: owner_only (403) for anyone else.
    """
    if not current_user.is_owner:
        raise RefusedError("owner_only", 403)
    return current_user


def get_current_manager(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    Let only a Management User through, for what the Management Role opens rather than a Permission.

    Args:
        current_user (CurrentUser): The signed-in User.

    Returns:
        CurrentUser: The Management User.

    Raises:
        RefusedError: management_only (403) for any other Role.
    """
    if current_user.role != MANAGEMENT_ROLE:
        raise RefusedError("management_only", 403)
    return current_user
