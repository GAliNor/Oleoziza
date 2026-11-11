from uuid import UUID

from fastapi import Request, Response

from core.config import get_settings


REFRESH_COOKIE_PREFIX = "refresh_token_"


def build_refresh_cookie_name(user_id: UUID) -> str:
    """
    Name the refresh cookie of one User, so several Operators sharing a phone each keep their own.

    Args:
        user_id (UUID): User the cookie belongs to.

    Returns:
        str: Cookie name, refresh_token_<user id>.
    """
    return f"{REFRESH_COOKIE_PREFIX}{user_id}"


def read_refresh_cookie(request: Request, user_id: UUID) -> str | None:
    """
    Read the refresh token a User's cookie carries on this device.

    Args:
        request (Request): Incoming request with its cookies.
        user_id (UUID): User whose cookie to read.

    Returns:
        str | None: The refresh token, or None when the device has no cookie for this User.
    """
    return request.cookies.get(build_refresh_cookie_name(user_id))


def set_refresh_cookie(response: Response, user_id: UUID, refresh_token: str) -> None:
    """
    Send a User's refresh token as an httpOnly, SameSite=strict cookie scoped to the auth routes.

    Args:
        response (Response): Response carrying the cookie.
        user_id (UUID): User the token belongs to.
        refresh_token (str): Signed refresh token.
    """
    settings = get_settings()
    response.set_cookie(
        key=build_refresh_cookie_name(user_id),
        value=refresh_token,
        max_age=settings.AUTH_REFRESH_TOKEN_EXPIRY_IN_SECONDS,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        secure=settings.AUTH_REFRESH_COOKIE_SECURE,
        httponly=True,
        samesite="strict",
    )


def delete_refresh_cookie(response: Response, user_id: UUID) -> None:
    """
    Remove a User's refresh cookie with the same attributes it was set with.

    Args:
        response (Response): Response clearing the cookie.
        user_id (UUID): User whose cookie to remove.
    """
    settings = get_settings()
    response.delete_cookie(
        key=build_refresh_cookie_name(user_id),
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        secure=settings.AUTH_REFRESH_COOKIE_SECURE,
        httponly=True,
        samesite="strict",
    )
