from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel

from core.types import CamelModel
from modules.user.types.user_types import LoginMethod


class CredentialKind(StrEnum):
    """
    The secret a User logs in with.
    """

    PIN = "pin"
    PASSWORD = "password"


class OneTimeCodePurpose(StrEnum):
    """
    What a one-time SMS code or email link is for.
    """

    LOGIN = "login"
    RESET = "reset"


class MessageChannel(StrEnum):
    """
    How a message reaches a person.
    """

    SMS = "sms"
    EMAIL = "email"


class LoginOptionsIn(CamelModel):
    identifier: str


class LoginOptionsOut(CamelModel):
    identifier: str
    login_methods: list[LoginMethod]


class LoginIn(CamelModel):
    identifier: str
    method: LoginMethod
    secret: str


class LoginOut(CamelModel):
    access_token: str
    must_change_credential: bool
    can_skip_credential_change: bool
    credential_kind: CredentialKind | None
    can_offer_pin: bool


class SessionIn(CamelModel):
    user_id: UUID


class AccessTokenOut(CamelModel):
    access_token: str


class CredentialChangeIn(CamelModel):
    kind: CredentialKind
    secret: str
    current_secret: str | None = None


class InvitationOut(CamelModel):
    first_name: str
    last_name: str
    invited_by: str
    credential_kind: CredentialKind
    identifier: str


class InvitationAcceptIn(CamelModel):
    secret: str


class IssuedTokens(BaseModel):
    """
    A signed token pair: the access token for the body, the refresh token for the User's cookie.
    """

    user_id: UUID
    access_token: str
    refresh_token: str


class IssuedLogin(BaseModel):
    """
    The outcome of a successful login: the body for the front and the refresh token for the cookie.
    """

    result: LoginOut
    tokens: IssuedTokens


SEND_INVITATION_TASK = "auth.send_invitation"
