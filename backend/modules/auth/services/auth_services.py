from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import get_settings
from core.database import get_db
from core.exceptions import AuthError
from core.security import REFRESH_TOKEN_TYPE, decode_token, get_signing_key
from modules.auth.business.auth_secrets import get_dummy_secret_hash, hash_secret, is_secret_valid
from modules.auth.business.auth_tokens import build_access_token, build_refresh_token
from modules.auth.helpers.auth_identifiers import is_email, normalize_identifier
from modules.auth.models.auth_models import Credential
from modules.auth.types.auth_types import CredentialKind, IssuedLogin, IssuedTokens, LoginIn, LoginOptionsOut, LoginOut
from modules.site.models.site_models import Site
from modules.site.types.site_types import SiteStatus
from modules.user.models.user_models import SiteAssignment, SiteAssignmentPermission, User, UserLoginMethod
from modules.user.types.user_types import LoginMethod, Permission, Role, UserStatus


INVALID_IDENTIFIER_CODE = "invalid_identifier"

UNKNOWN_IDENTIFIER_CODE = "unknown_identifier"

METHOD_NOT_ALLOWED_CODE = "method_not_allowed"

INVALID_CREDENTIAL_CODE = "invalid_credential"

LOCKED_CODE = "locked"

DISABLED_CODE = "disabled"

SESSION_EXPIRED_CODE = "session_expired"

PIN_LENGTH = 4

PASSWORD_MIN_LENGTH = 8

CREDENTIAL_KIND_BY_METHOD: dict[LoginMethod, CredentialKind] = {
    LoginMethod.PHONE_PIN: CredentialKind.PIN,
    LoginMethod.EMAIL_PASSWORD: CredentialKind.PASSWORD,
}


class AuthService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session used to read Users and record their logins.

        Args:
            db (Session): Request-scoped database session.
        """
        self.db = db
        self.settings = get_settings()

    def get_login_options(self, raw_identifier: str) -> LoginOptionsOut:
        """
        List the Login Methods a User may use with the identifier they typed.

        Args:
            raw_identifier (str): Phone or email as typed.

        Returns:
            LoginOptionsOut: The normalized identifier and its usable Login Methods.

        Raises:
            AuthError: invalid_identifier, unknown_identifier, disabled, or method_not_allowed when none fits.
        """
        identifier = self._normalize(raw_identifier)
        user = self._get_loggable_user(identifier)
        login_methods = [method for method in self._get_login_methods(user) if self._fits_identifier(method, identifier) and self._has_secret_for(user, method)]
        if not login_methods:
            raise AuthError(METHOD_NOT_ALLOWED_CODE, 400)
        return LoginOptionsOut(identifier=identifier, login_methods=login_methods)

    def login(self, payload: LoginIn) -> IssuedLogin:
        """
        Log a User in with a PIN or a password, locking the account for a while after too many wrong tries.

        Args:
            payload (LoginIn): Identifier, Login Method and secret.

        Returns:
            IssuedLogin: The login result for the front and the token pair.

        Raises:
            AuthError: invalid_identifier, unknown_identifier, disabled, method_not_allowed, locked or invalid_credential.
        """
        identifier = self._normalize(payload.identifier)
        user = self._get_loggable_user(identifier)
        if payload.method not in CREDENTIAL_KIND_BY_METHOD or payload.method not in self._get_login_methods(user) or not self._fits_identifier(payload.method, identifier):
            raise AuthError(METHOD_NOT_ALLOWED_CODE, 400)
        now = datetime.now(timezone.utc)
        if user.locked_until is not None and user.locked_until > now:
            raise AuthError(LOCKED_CODE, 423, user.locked_until)
        credential = self._get_credential(user.id, CREDENTIAL_KIND_BY_METHOD[payload.method])
        is_valid = is_secret_valid(payload.secret, credential.hash if credential else get_dummy_secret_hash())
        if credential is None or not is_valid:
            self._record_failed_login(user, now)
        user.failed_login_attempts = 0
        user.locked_until = None
        return self.open_session(user, payload.method)

    def open_session(self, user: User, method: LoginMethod | None) -> IssuedLogin:
        """
        Stamp a User's login and issue their token pair with what the front must do next.

        Args:
            user (User): User logging in.
            method (LoginMethod | None): Method used, None after accepting an Invitation.

        Returns:
            IssuedLogin: The login result for the front and the token pair.
        """
        user.last_login_at = datetime.now(timezone.utc)
        self.db.commit()
        tokens = self._issue_tokens(user)
        return IssuedLogin(result=self._build_login_result(user, method, tokens.access_token), tokens=tokens)

    def refresh(self, user_id: UUID, refresh_token: str | None) -> IssuedTokens:
        """
        Issue a fresh access token with the User's current Permissions and rotate their refresh token, after checking the User in the database.

        Args:
            user_id (UUID): User the front asks to refresh.
            refresh_token (str | None): Refresh token from that User's cookie.

        Returns:
            IssuedTokens: New access token and rotated refresh token.

        Raises:
            AuthError: session_expired if the cookie is missing, invalid, expired, for another User or revoked; disabled if the User was disabled.
        """
        if refresh_token is None:
            raise AuthError(SESSION_EXPIRED_CODE)
        claims = decode_token(refresh_token, REFRESH_TOKEN_TYPE)
        user = self.db.get(User, user_id)
        if user is None or claims["sub"] != str(user_id) or claims.get("tv") != user.token_version:
            raise AuthError(SESSION_EXPIRED_CODE)
        if user.status != UserStatus.ACTIVE:
            raise AuthError(DISABLED_CODE, 403)
        return self._issue_tokens(user)

    def change_credential(self, user_id: UUID, kind: CredentialKind, secret: str, current_secret: str | None) -> IssuedTokens:
        """
        Set a User's new PIN or password, revoke their refresh tokens on every other device, and issue a new pair for this one; outside a forced change, the current secret is checked first.

        Args:
            user_id (UUID): Signed-in User.
            kind (CredentialKind): PIN or password.
            secret (str): New plain secret.
            current_secret (str | None): One of the User's current secrets, required unless the change is forced.

        Returns:
            IssuedTokens: New token pair for the current device.

        Raises:
            AuthError: session_expired if the User is gone; invalid_credential if the current secret is wrong or the new one too weak.
        """
        user = self._get_active_user(user_id)
        if not user.must_change_credential and not self._is_current_secret(user.id, current_secret):
            raise AuthError(INVALID_CREDENTIAL_CODE, 400)
        if not self.is_secret_strong_enough(kind, secret):
            raise AuthError(INVALID_CREDENTIAL_CODE, 400)
        credential = self._get_credential(user.id, kind) or Credential(user_id=user.id, kind=kind, created_by_id=user.id)
        credential.hash = hash_secret(secret)
        credential.updated_by_id = user.id
        self.db.add(credential)
        user.must_change_credential = False
        user.token_version += 1
        self.db.commit()
        return self._issue_tokens(user)

    def skip_credential_change(self, user_id: UUID) -> None:
        """
        Let a Client keep the first secret Management set, once.

        Args:
            user_id (UUID): Signed-in User.

        Raises:
            AuthError: session_expired if the User is gone; method_not_allowed for staff, who must change it.
        """
        user = self._get_active_user(user_id)
        if user.role != Role.CLIENT:
            raise AuthError(METHOD_NOT_ALLOWED_CODE, 403)
        user.must_change_credential = False
        self.db.commit()

    def _normalize(self, raw_identifier: str) -> str:
        """
        Normalize an identifier or refuse it.

        Args:
            raw_identifier (str): Phone or email as typed.

        Returns:
            str: Normalized identifier.

        Raises:
            AuthError: invalid_identifier when it is neither an email nor a Moroccan phone.
        """
        identifier = normalize_identifier(raw_identifier)
        if identifier is None:
            raise AuthError(INVALID_IDENTIFIER_CODE, 400)
        return identifier

    def _get_loggable_user(self, identifier: str) -> User:
        """
        Find the User behind an identifier, refusing Users still invited or disabled.

        Args:
            identifier (str): Normalized phone or email.

        Returns:
            User: An active User.

        Raises:
            AuthError: unknown_identifier for no User or an invited one; disabled for a disabled one.
        """
        column = User.email if is_email(identifier) else User.phone
        user = self.db.scalar(select(User).where(column == identifier))
        if user is None or user.status == UserStatus.INVITED:
            raise AuthError(UNKNOWN_IDENTIFIER_CODE, 404)
        if user.status == UserStatus.DISABLED:
            raise AuthError(DISABLED_CODE, 403)
        return user

    def _get_active_user(self, user_id: UUID) -> User:
        """
        Load the signed-in User, refusing one deleted or disabled since their token was signed.

        Args:
            user_id (UUID): Id from the access token.

        Returns:
            User: The active User.

        Raises:
            AuthError: session_expired if the User is missing; disabled if disabled.
        """
        user = self.db.get(User, user_id)
        if user is None:
            raise AuthError(SESSION_EXPIRED_CODE)
        if user.status == UserStatus.DISABLED:
            raise AuthError(DISABLED_CODE, 403)
        return user

    def _get_login_methods(self, user: User) -> list[LoginMethod]:
        """
        List the Login Methods Management allowed for a User.

        Args:
            user (User): User to read.

        Returns:
            list[LoginMethod]: Allowed methods, in a stable order.
        """
        methods = self.db.scalars(select(UserLoginMethod.method).where(UserLoginMethod.user_id == user.id)).all()
        return [method for method in LoginMethod if method in methods]

    def _get_credential(self, user_id: UUID, kind: CredentialKind) -> Credential | None:
        """
        Find a User's PIN or password hash.

        Args:
            user_id (UUID): User to read.
            kind (CredentialKind): PIN or password.

        Returns:
            Credential | None: The Credential, or None when never set.
        """
        return self.db.scalar(select(Credential).where(Credential.user_id == user_id, Credential.kind == kind))

    def _has_secret_for(self, user: User, method: LoginMethod) -> bool:
        """
        Tell whether a Login Method can be offered: PIN and password need their Credential, an SMS code needs nothing stored.

        Args:
            user (User): User to check.
            method (LoginMethod): Method to offer.

        Returns:
            bool: True when the method is usable now.
        """
        kind = CREDENTIAL_KIND_BY_METHOD.get(method)
        return kind is None or self._get_credential(user.id, kind) is not None

    def _fits_identifier(self, method: LoginMethod, identifier: str) -> bool:
        """
        Tell whether a Login Method matches the identifier typed: a password with an email, a PIN or SMS code with a phone.

        Args:
            method (LoginMethod): Method to check.
            identifier (str): Normalized identifier.

        Returns:
            bool: True when they go together.
        """
        return (method == LoginMethod.EMAIL_PASSWORD) == is_email(identifier)

    def _record_failed_login(self, user: User, now: datetime) -> None:
        """
        Count a wrong secret and lock the account once the limit is reached, then refuse the login.

        Args:
            user (User): User who failed.
            now (datetime): Time of the try.

        Raises:
            AuthError: locked with its end when the limit is reached, otherwise invalid_credential.
        """
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= self.settings.AUTH_MAX_FAILED_LOGIN_ATTEMPTS:
            user.failed_login_attempts = 0
            user.locked_until = now + timedelta(seconds=self.settings.AUTH_LOCK_DURATION_IN_SECONDS)
            self.db.commit()
            raise AuthError(LOCKED_CODE, 423, user.locked_until)
        self.db.commit()
        raise AuthError(INVALID_CREDENTIAL_CODE)

    def _is_current_secret(self, user_id: UUID, current_secret: str | None) -> bool:
        """
        Tell whether a secret matches one of the User's stored PIN or password.

        Args:
            user_id (UUID): User to check.
            current_secret (str | None): Secret typed as the current one.

        Returns:
            bool: True when it matches a stored Credential.
        """
        if not current_secret:
            return False
        credentials = self.db.scalars(select(Credential).where(Credential.user_id == user_id)).all()
        return any(is_secret_valid(current_secret, credential.hash) for credential in credentials)

    def is_secret_strong_enough(self, kind: CredentialKind, secret: str) -> bool:
        """
        Check a new secret against the rules the front enforces: a 4-digit PIN, a password of 8 characters or more.

        Args:
            kind (CredentialKind): PIN or password.
            secret (str): New plain secret.

        Returns:
            bool: True when the secret is acceptable.
        """
        if kind == CredentialKind.PIN:
            return len(secret) == PIN_LENGTH and secret.isdigit()
        return len(secret) >= PASSWORD_MIN_LENGTH

    def _build_login_result(self, user: User, method: LoginMethod | None, access_token: str) -> LoginOut:
        """
        Tell the front what follows a login: a forced credential change, whether a Client may skip it, and which secret to set.

        Args:
            user (User): User who logged in.
            method (LoginMethod | None): Method used, None after accepting an Invitation.
            access_token (str): Access token just issued.

        Returns:
            LoginOut: The login result.
        """
        login_methods = self._get_login_methods(user)
        credential_kind = CredentialKind.PASSWORD if method == LoginMethod.EMAIL_PASSWORD else CredentialKind.PIN if LoginMethod.PHONE_PIN in login_methods else None
        return LoginOut(
            access_token=access_token,
            must_change_credential=user.must_change_credential and credential_kind is not None,
            can_skip_credential_change=user.role == Role.CLIENT,
            credential_kind=credential_kind,
            can_offer_pin=False,
        )

    def _build_permissions_by_site(self, user: User) -> dict[str, list[str]]:
        """
        Gather the Permissions a User holds per Site; the Owner gets every Permission on every active Site.

        Args:
            user (User): User the token is for.

        Returns:
            dict[str, list[str]]: Permission keys per Site id.
        """
        if user.is_owner:
            site_ids = self.db.scalars(select(Site.id).where(Site.status == SiteStatus.ACTIVE)).all()
            return {str(site_id): [permission.value for permission in Permission] for site_id in site_ids}
        rows = self.db.execute(
            select(SiteAssignment.site_id, SiteAssignmentPermission.permission)
            .join(SiteAssignmentPermission, SiteAssignmentPermission.site_assignment_id == SiteAssignment.id)
            .where(SiteAssignment.user_id == user.id)
        ).all()
        permissions_by_site: dict[str, list[str]] = {}
        for site_id, permission in rows:
            permissions_by_site.setdefault(str(site_id), []).append(permission.value)
        return permissions_by_site

    def _issue_tokens(self, user: User) -> IssuedTokens:
        """
        Sign a fresh access and refresh token pair for a User.

        Args:
            user (User): Signed-in User.

        Returns:
            IssuedTokens: The pair, with the User's id for the cookie name.
        """
        signing_key = get_signing_key()
        login_methods = self._get_login_methods(user)
        credential_kinds = [kind.value for method, kind in CREDENTIAL_KIND_BY_METHOD.items() if method in login_methods]
        access_token = build_access_token(user, self._build_permissions_by_site(user), signing_key, self.settings.AUTH_ACCESS_TOKEN_EXPIRY_IN_SECONDS, credential_kinds)
        refresh_token = build_refresh_token(user, signing_key, self.settings.AUTH_REFRESH_TOKEN_EXPIRY_IN_SECONDS)
        return IssuedTokens(user_id=user.id, access_token=access_token, refresh_token=refresh_token)


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """
    Build the auth service for one request.

    Args:
        db (Session): Request-scoped database session.

    Returns:
        AuthService: Service bound to the session.
    """
    return AuthService(db)
